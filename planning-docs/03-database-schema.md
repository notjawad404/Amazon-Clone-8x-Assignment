# Database Schema

This document defines the MongoDB collections for the Amazon clone: their fields, the relationships between them, the indexes they need, and how they support each of the app's main flows. It covers:

- the catalog (products and categories), which is owned and managed in MongoDB
- the shopping data: users, carts, and reviews
- the checkout and payment data: checkouts, orders, Stripe payments, and webhook events

Related docs: [01-initial-plan.md](01-initial-plan.md), [02-project-structure.md](02-project-structure.md), [04-development-phases.md](04-development-phases.md), [05-coding-standards.md](05-coding-standards.md).

---

## 1. Overview

| Collection | Purpose | Approx. size after seeding |
|---|---|---|
| `users` | Accounts, credentials, saved addresses | 2 (demo + admin), grows with sign-ups |
| `categories` | Two-level category tree (department → category), managed by admins | 28 (6 + 22) |
| `products` | Catalog with embedded variants, managed by admins | 184 |
| `reviews` | Product reviews | ~1,600 |
| `carts` | One cart per signed-in user | 1 per user |
| `checkouts` | One checkout session per attempt: items, address, delivery method, price quote | Short-lived, open ones expire after 24 h |
| `orders` | Placed orders with item and address snapshots | 4 seeded, then grows |
| `payments` | One Stripe PaymentIntent per order: status, card, errors, refunds | 1 per order |
| `stripeEvents` | Log of received Stripe webhook events, so each is processed only once | Kept 90 days |

General conventions:

- All monetary values are **integer cents** (`priceCents: 1999` = $19.99).
- All collections have `createdAt` / `updatedAt` (Mongoose `timestamps: true`).
- References use `ObjectId` with `ref` so `populate()` works.
- Data is **embedded** when it is always read together with its parent and is bounded in size (variants, cart items, order items, addresses, refunds). Data is **referenced** when it grows without bound or is read on its own (reviews, orders, payments).
- The guest cart is **not** stored in MongoDB. It lives in the browser (Redux + localStorage) and is merged into `carts` when the guest signs in.

---

## 2. Catalog Ownership: From DummyJSON to MongoDB

**MongoDB is the only source of truth for products and categories.** DummyJSON is used **once**, as starter content for the first import. After that the catalog is managed in MongoDB through the admin catalog pages (or Compass/Atlas), and the app never calls DummyJSON.

```
  (one time)                         (one time)                       (ongoing)
DummyJSON API ──seed:fetch──► seed/data/*.json ──seed──► MongoDB ◄──── Admin catalog pages
                                                       categories        (create, edit, archive
                                                       products          products, categories,
                                                       reviews           variants, images)
                                                          │
                                                          ▼
                                            Express API ──► React app
```

| Step | Command | What happens | When |
|---|---|---|---|
| 1. Snapshot | `npm run seed:fetch` | Downloads `/products?limit=0` and `/products/categories` into `server/src/seed/data/` (committed to git) | Once. Already verified working |
| 2. Import | `npm run seed` | Creates the categories, products, and reviews from the snapshot, uploads the images to Cloudinary, and creates demo users and orders | Once per database (local, then production) |
| 3. Manage | Admin pages at `/admin/*` | Add, edit, and archive products and categories. Upload images. Change prices and stock | Ongoing |

**Seed safety rules**, so that your own edits are never lost:

- `npm run seed` checks first and **refuses to run if the `products` or `categories` collections already contain documents**. It prints the counts and exits.
- `npm run seed -- --reset` drops **all** collections and re-imports. It only works when `NODE_ENV !== "production"`, and it asks for confirmation (`--yes` skips the prompt).
- Imported documents are marked `source.provider: "dummyjson"`, and anything created in the admin pages is marked `source.provider: "manual"`. Once imported, the two kinds are managed the same way. The marker only records where a document came from.
- After the import, the files in `seed/data/` are only needed to re-seed a fresh development database. They can be deleted without affecting the running app.

---

## 3. Source Data: DummyJSON (initial import only)

### 3.1 Endpoints tested (2026-10-04)

All tested endpoints responded correctly. A typical response took about 0.6–0.9 s.

| Endpoint | Status | Notes |
|---|---|---|
| `GET https://dummyjson.com/products?limit=0` | 200 | Returns **all 194 products** in one response: `{ products, total, skip, limit }` |
| `GET /products/1` | 200 | Single product |
| `GET /products/9999` | 404 | `{ "message": "Product with id '9999' not found" }` |
| `GET /products/categories` | 200 | `[{ slug, name, url }]`, 24 categories |
| `GET /products/category-list` | 200 | `["beauty", "fragrances", ...]` (slugs only) |
| `GET /products/category/smartphones` | 200 | Products in one category |
| `GET /products/search?q=phone` | 200 | Text search |
| `GET /products?limit=2&skip=10&select=title,price` | 200 | Pagination + field selection work |
| `GET /products?sortBy=price&order=desc` | 200 | Sorting works |
| Image CDN `cdn.dummyjson.com/product-images/...webp` | 200 | All **668** image + thumbnail URLs checked, 0 failures |

The API returns `x-ratelimit-limit: 100`. Because `limit=0` returns the whole catalog in a single call, the snapshot needs only 2 API calls.

### 3.2 DummyJSON product shape

```json
{
  "id": 1,
  "title": "Essence Mascara Lash Princess",
  "description": "The Essence Mascara Lash Princess is a popular mascara ...",
  "category": "beauty",
  "price": 9.99,
  "discountPercentage": 10.48,
  "rating": 2.56,
  "stock": 99,
  "tags": ["beauty", "mascara"],
  "brand": "Essence",
  "sku": "BEA-ESS-ESS-001",
  "weight": 4,
  "dimensions": { "width": 15.14, "height": 13.08, "depth": 22.99 },
  "warrantyInformation": "1 week warranty",
  "shippingInformation": "Ships in 3-5 business days",
  "availabilityStatus": "In Stock",
  "reviews": [
    { "rating": 3, "comment": "Would not recommend!", "date": "2025-04-30T09:41:02.053Z",
      "reviewerName": "Eleanor Collins", "reviewerEmail": "eleanor.collins@x.dummyjson.com" }
  ],
  "returnPolicy": "No return policy",
  "minimumOrderQuantity": 48,
  "meta": { "createdAt": "...", "updatedAt": "...", "barcode": "5784719087687", "qrCode": "..." },
  "images": ["https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp"],
  "thumbnail": "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp"
}
```

DummyJSON category shape: `{ "slug": "beauty", "name": "Beauty", "url": "https://dummyjson.com/products/category/beauty" }`.

### 3.3 How DummyJSON fields map to our schema

| DummyJSON field | Our field | Transformation |
|---|---|---|
| `id` | `source.externalId` | As is, with `source.provider = "dummyjson"` |
| `title` | `title`, `slug` | Slug = `slugify(title)`, with `-2` added on collision |
| `description` | `description`, `bullets` | Bullets = description split into sentences + warranty, returns, and shipping lines |
| `category` | `category` (+ `department`) | Through the category mapping (§3.5) |
| `brand` | `brand` | Missing → `"Generic"` |
| `price`, `discountPercentage` | `variants[].priceCents`, `listPriceCents` | `round(price*100)`. List price only if the discount is at least 5% |
| `stock` | `variants[].stock` | Split across the generated variants |
| `sku` | `variants[].sku` | Source SKU + variant suffix |
| `tags` | `tags` | As is |
| `images` | `images[]` | Uploaded to Cloudinary, store `{ url, publicId, alt }` |
| `thumbnail` | (not stored) | Thumbnails come from Cloudinary transforms of `images[0]` |
| `weight`, `dimensions`, `warrantyInformation`, `returnPolicy`, `shippingInformation` | `specs` | As is |
| `reviews[]` | `reviews` collection | `reviewerName` → `authorName`, `comment` → `body` |
| `rating` | (used as a target) | Generated reviews are skewed toward it, then `ratingAvg` is calculated from the reviews |
| `availabilityStatus`, `minimumOrderQuantity`, `meta`, `reviewerEmail` | (dropped) | Calculated from stock, or not needed |

### 3.4 What the data looks like, and what the import has to fix

| Finding | How the import handles it |
|---|---|
| 194 products in 24 flat categories, with no hierarchy | Map them into 6 departments (§3.5) |
| `vehicle` (5) and `motorcycle` (5) cost $3k–$37k | **Excluded**, which leaves 184 products |
| **No variants** | Generate variants per category (§3.6) |
| `brand` missing on 92 of 194 | Default to `"Generic"` |
| Exactly 3 reviews per product, all dated 2025-04-30, and the source `rating` doesn't match their average | Keep them, add 0–12 generated reviews (faker) with dates spread over the past 18 months, then calculate `ratingAvg` |
| `stock` ranges 0–100, and 4 products have 0 | Lets the out-of-stock states be tested |
| One duplicate title: "Rolex Cellini Moonphase" (ids 96, 191) | Add a slug suffix to the duplicate |
| 41 image URLs contain `'`, `&`, or spaces | `encodeURI()` before fetching or uploading |
| No sales data | Seed `salesCount` with a random value weighted by rating and review count |

### 3.5 Category mapping (24 → 6 departments, 22 categories)

| Department (`level 0`) | Categories (`level 1`) ← DummyJSON slug | Products |
|---|---|---|
| **Electronics** | Smartphones ← `smartphones` · Laptops ← `laptops` · Tablets ← `tablets` · Mobile Accessories ← `mobile-accessories` | 38 |
| **Fashion** | Men's Shirts ← `mens-shirts` · Men's Shoes ← `mens-shoes` · Men's Watches ← `mens-watches` · Women's Tops ← `tops` · Women's Dresses ← `womens-dresses` · Women's Shoes ← `womens-shoes` · Women's Bags ← `womens-bags` · Women's Jewelry ← `womens-jewellery` · Women's Watches ← `womens-watches` · Sunglasses ← `sunglasses` | 49 |
| **Home & Kitchen** | Furniture ← `furniture` · Home Décor ← `home-decoration` · Kitchen & Dining ← `kitchen-accessories` | 40 |
| **Grocery** | Grocery & Gourmet Food ← `groceries` | 27 |
| **Sports & Outdoors** | Sports & Fitness ← `sports-accessories` | 17 |
| **Beauty & Personal Care** | Makeup ← `beauty` · Fragrances ← `fragrances` · Skin Care ← `skin-care` | 13 |
| *(excluded)* | `vehicle`, `motorcycle` | 10 |

This mapping lives in `server/src/seed/categoryMap.js` and is only used during the import. Categories added later are created in the admin pages.

### 3.6 Variant generation rules (import only)

The product images show one color per product, so the import varies **size and configuration only**, never color. Products added later in the admin pages can use any option name, including Color, with images per variant.

| Categories | `optionName` | Values | Price rule |
|---|---|---|---|
| Men's Shirts, Women's Tops, Women's Dresses | Size | S, M, L, XL | Same price |
| Men's Shoes | Size | US 8, 9, 10, 11, 12 | Same price |
| Women's Shoes | Size | US 5, 6, 7, 8, 9 | Same price |
| Smartphones, Tablets | Storage | 128 GB, 256 GB, 512 GB | +$0 / +$100 / +$200 |
| Laptops | Configuration | 16 GB / 512 GB, 32 GB / 1 TB | +$0 / +$300 |
| Everything else | `null` | One default variant labelled "Standard" | Source price |

The source `stock` is split randomly across the variants. About 10% of variants get stock 0. The first in-stock variant is marked `isDefault`.

---

## 4. Relationships

```
                         ┌──────────────┐
             ┌──────────►│  categories  │◄──┐ parent (self-ref, null = department)
             │           └──────▲───────┘───┘
             │   department,    │
             │   category (N:1) │
             │           ┌──────┴───────┐ 1      N ┌───────────┐
             │           │   products   │◄─────────┤  reviews  │
             │           │  └ variants[]│          └─────┬─────┘
             │           └──────▲───────┘                │ user (optional)
  createdBy, │   product +      │                        ▼
  updatedBy  │   variantId      │                 ┌──────────────┐
             │   (N:1)          │                 │    users     │
             │       ┌──────────┴──────────┐      │ └ addresses[]│
             │       │ carts.items[]       │─────►│              │◄─────────────┐
             │       │ checkouts.items[]   │ user └──────▲───────┘              │
             │       │ orders.items[]      │             │ user                 │ user
             │       └─────────────────────┘             │                      │
             │                                    ┌──────┴───────┐ 1   1 ┌──────┴──────┐
             └────────────────────────────────────┤  checkouts   ├──────►│   orders    │
                                                  └──────────────┘ order └──────┬──────┘
                                                                                │ 1
                                                                                │ payment
                                                                                ▼ 1
                                             ┌──────────────┐  paymentIntentId ┌─────────────┐
                                             │ stripeEvents │ ················►│  payments   │
                                             └──────────────┘  (lookup, no ref)│ └ refunds[] │
                                                                               └─────────────┘
```

| From | To | Type | Stored as | Notes |
|---|---|---|---|---|
| `categories.parent` | `categories` | N:1 | ObjectId \| null | `null` for departments |
| `products.department` | `categories` (level 0) | N:1 | ObjectId | Stored on the product so filtering by department needs no lookup. Kept in sync with `category.parent` |
| `products.category` | `categories` (level 1) | N:1 | ObjectId | |
| `products/categories.createdBy`, `updatedBy` | `users` (admin) | N:1 | ObjectId \| null | `null` for imported documents |
| `reviews.product` | `products` | N:1 | ObjectId | |
| `reviews.user` | `users` | N:1 | ObjectId \| null | `null` for seeded reviewers |
| `carts.user` | `users` | 1:1 | ObjectId, unique | |
| `carts.items[]`, `checkouts.items[]` | `products` + variant | N:1 | ObjectId + variant ObjectId | Prices are read live from the product |
| `checkouts.user` | `users` | N:1 | ObjectId | |
| `checkouts.order` ↔ `orders.checkout` | | 1:1 | ObjectId, unique on `orders.checkout` | Set when the order is placed |
| `orders.user` | `users` | N:1 | ObjectId | |
| `orders.items[]` | `products` + variant | N:1 | ObjectId + snapshot fields | Display uses the snapshot |
| `orders.payment` ↔ `payments.order` | | 1:1 | ObjectId, unique on `payments.order` | |
| `payments.user` | `users` | N:1 | ObjectId | |
| `stripeEvents.objectId` | `payments.stripePaymentIntentId` | lookup | String | Not a Mongo reference. Events are matched by Stripe id |

---

## 5. Collections

Types use Mongoose terms. **R** = required, **U** = unique.

### 5.1 `users`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `name` | String | R, trim, 2–50 chars | |
| `email` | String | R, U, lowercase, trim | Login identifier |
| `passwordHash` | String | R, `select: false` | bcrypt, cost 12. Never returned by the API |
| `role` | String | enum `user` \| `admin`, default `user` | `admin` can use `/admin/*` and `/api/admin/*` |
| `addresses` | [Address] | max 10 | Embedded, see below |

**Address** (subdocument, has its own `_id`)

| Field | Type | Rules |
|---|---|---|
| `fullName` | String | R |
| `line1` | String | R |
| `line2` | String | optional |
| `city` | String | R |
| `state` | String | R, 2-letter code |
| `zip` | String | R, `^\d{5}(-\d{4})?$` |
| `country` | String | R, default `"US"` |
| `phone` | String | R |
| `isDefault` | Boolean | At most one per user, enforced in the service layer |

### 5.2 `categories` (managed catalog)

| Field | Type | Rules | Notes |
|---|---|---|---|
| `name` | String | R, trim, 2–60 chars | "Electronics", "Smartphones" |
| `slug` | String | R, U, lowercase, `^[a-z0-9-]+$` | Generated from the name, editable. URL: `/c/:slug` |
| `description` | String | max 500 | Optional text on the category page |
| `parent` | ObjectId → categories | default `null` | `null` = department. A category's parent must be a department, so there are at most 2 levels |
| `level` | Number | 0 \| 1 | Calculated from `parent` in `pre('validate')` |
| `image` | `{ url, publicId, alt }` | optional | Tile on the homepage and department pages |
| `sortOrder` | Number | default 0 | Order in the nav, sidebar, and filters |
| `isActive` | Boolean | default `true` | Inactive categories (and their products) are hidden from shoppers |
| `source` | `{ provider: "dummyjson" \| "manual", externalId: String \| null, importedAt: Date \| null }` | R | Records where the category came from |
| `createdBy`, `updatedBy` | ObjectId → users \| null | | Set by the admin API |

**Rules for managing categories** (enforced in `adminCategory.service.js`):

- A category **cannot be deleted** if any product or child category references it. It has to be emptied or deactivated first.
- Moving a category to another department (changing `parent`) also updates `department` on all of its products, inside the same transaction.
- Deactivating a department hides all of its categories from shoppers.

### 5.3 `products` (managed catalog)

| Field | Type | Rules | Notes |
|---|---|---|---|
| `title` | String | R, trim, 3–200 chars | |
| `slug` | String | R, U, lowercase | Generated from the title when the product is created, editable |
| `brand` | String | R, trim, default `"Generic"` | Brand filter |
| `department` | ObjectId → categories | R | Always set to the category's parent by a hook. Never set from client input |
| `category` | ObjectId → categories | R | Must be a level-1 category |
| `description` | String | R, max 5,000 | |
| `bullets` | [String] | max 10, each max 300 | "About this item" |
| `tags` | [String] | max 20, lowercase | Included in text search |
| `images` | [{ `url`, `publicId`, `alt` }] | R (min 1 when `active`), max 10 | Cloudinary. The order of the array is the display order |
| `optionName` | String \| null | | "Size", "Storage", "Color", or `null` for single-variant products |
| `variants` | [Variant] | R, 1–20 | See below |
| `specs` | `{ weightOz, dimensions: { width, height, depth }, warranty, returnPolicy, shippingNote }` | all optional | "Product information" table |
| `status` | String | enum `draft` \| `active` \| `archived`, default `draft` | Only `active` products are visible to shoppers. Imported products start as `active` |
| `ratingAvg` | Number | 0–5 | Recalculated when reviews change |
| `ratingCount` | Number | default 0 | |
| `ratingBreakdown` | `{ 1..5: Number }` | | Rating histogram |
| `minPriceCents`, `maxPriceCents` | Number | | Calculated from variants. Used to filter and sort by price |
| `maxDiscountPercent` | Number | | Calculated. Used for the "% off" badge |
| `totalStock` | Number | | Calculated |
| `inStock` | Boolean | | Calculated: `totalStock > 0` |
| `salesCount` | Number | default 0 | Increased when an order is paid |
| `source` | `{ provider: "dummyjson" \| "manual", externalId, importedAt }` | R | |
| `createdBy`, `updatedBy` | ObjectId → users \| null | | |
| `publishedAt` | Date \| null | | Set the first time `status` becomes `active`. Used by "New Arrivals" |

**Variant** (subdocument. Its `_id` is the `variantId` used in carts, checkouts, and orders)

| Field | Type | Rules | Notes |
|---|---|---|---|
| `sku` | String | R, U across all products, uppercase | |
| `label` | String | R, max 60 | "M", "256 GB", "Red", "Standard" |
| `priceCents` | Number | R, integer ≥ 1 | Selling price |
| `listPriceCents` | Number \| null | ≥ `priceCents` | Strikethrough "List:" price |
| `stock` | Number | R, integer ≥ 0 | |
| `images` | [{ `url`, `publicId`, `alt` }] | optional | Variant-specific images (e.g. per color). Falls back to the product images |
| `isDefault` | Boolean | Exactly one per product | |
| `isActive` | Boolean | default `true` | A variant that has been ordered is deactivated instead of deleted |

**Model hooks and helpers**

- `pre('validate')`:
  - generate the slug if it is empty
  - set `department` from the category's parent
  - make sure exactly one variant has `isDefault`
  - set `publishedAt` the first time the product becomes active
- `pre('save')`: recalculate `minPriceCents`, `maxPriceCents`, `maxDiscountPercent`, `totalStock`, and `inStock` from the active variants.
- `Product.syncStockFields(productId, session)` recalculates the stock fields after atomic `$inc` stock updates (orders, cancellations).

**Rules for managing products**

- **Products are never deleted.** They are archived (`status: "archived"`), because orders and reviews refer to them. A hard delete is only allowed for a `draft` that has never appeared in an order.
- **Variants that have been ordered are never removed.** They are deactivated (`isActive: false`). Price changes do not affect existing orders, because orders keep a snapshot.
- When an image is removed from a product, it is also deleted from Cloudinary (`cloudinary.uploader.destroy(publicId)`) after the product has been saved.
- Changing a product's stock in the admin pages sets the value directly (`stock = n`). Orders change stock with `$inc`. The two don't conflict because both run `syncStockFields` afterwards.

### 5.4 `reviews`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `product` | ObjectId → products | R | |
| `user` | ObjectId → users \| null | | `null` for seeded reviews |
| `authorName` | String | R | |
| `rating` | Number | R, integer 1–5 | |
| `title` | String | max 120 | |
| `body` | String | R, max 5,000 | |
| `verifiedPurchase` | Boolean | default `false` | |

Reviews are read-only for shoppers in the MVP. Admins can delete a review, which recalculates the product's rating fields.

### 5.5 `carts`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `user` | ObjectId → users | R, U | |
| `items` | [CartItem] | max 50 | |

**CartItem** (has its own `_id`, which is the `itemId` in cart routes)

| Field | Type | Rules | Notes |
|---|---|---|---|
| `product` | ObjectId → products | R | |
| `variantId` | ObjectId | R | |
| `qty` | Number | R, integer 1–30 | Capped at stock when the item is added or merged |
| `savedForLater` | Boolean | default `false` | |
| `addedPriceCents` | Number | R | Used for the "Price changed from $X" notice |
| `addedAt` | Date | default now | |

The pair (`product`, `variantId`) is unique within a cart. When the API returns a cart, it fills in each item's current details from `products` and flags items that are archived, inactive, or out of stock.

### 5.6 `checkouts`

A checkout is the **server-side record of one checkout attempt**. It is created when the user opens `/checkout` and holds the items, the selected address and delivery method, and the latest price quote. When the user clicks "Place your order", the checkout becomes an order. The checkout's id also acts as the idempotency key: one checkout can produce at most one order.

| Field | Type | Rules | Notes |
|---|---|---|---|
| `user` | ObjectId → users | R | |
| `source` | String | R, enum `cart` \| `buy_now` | |
| `items` | [{ `product`, `variantId`, `qty` }] | R, 1–50 | Copied from the cart (unsaved-for-later items) or from the Buy Now item when the checkout starts. Later cart edits start a new checkout |
| `addressId` | ObjectId \| null | | The selected `users.addresses._id` |
| `shippingAddress` | Address snapshot \| null | | Copied when an address is selected |
| `deliveryMethod` | String | enum `standard` \| `expedited` \| `nextday`, default `standard` | |
| `quote` | `{ subtotalCents, shippingCents, taxCents, totalCents, estimatedDelivery, computedAt }` | | Recalculated on every change, and again when the order is placed |
| `issues` | [{ `variantId`, `code`, `message` }] | | e.g. `out_of_stock`, `price_changed`, `unavailable`. Shown in "Review items" |
| `status` | String | enum `open` \| `completed`, default `open` | |
| `order` | ObjectId → orders \| null | | Set when the order is placed |
| `expiresAt` | Date | R | `createdAt + 24 h`. Open checkouts are deleted by a TTL index after this time |

Rules:

- Starting a new checkout deletes the user's other `open` checkouts. Only one checkout is in progress at a time.
- The client never sends prices. `quote` is always calculated on the server from the current variant prices.
- **Place order** compares the newly calculated total with the `expectedTotalCents` the client displayed. If they differ, it returns `409 price_changed` with the new quote, and the user has to confirm again.

### 5.7 `orders`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `orderNumber` | String | R, U | `112-1234567-1234567`. Used in URLs |
| `user` | ObjectId → users | R | |
| `checkout` | ObjectId → checkouts | R, U | One order per checkout, so a double click can't create two orders |
| `source` | String | enum `cart` \| `buy_now` | |
| `items` | [OrderItem] | R, min 1 | Snapshot |
| `shippingAddress` | Address snapshot | R | |
| `deliveryMethod` | String | enum | |
| `estimatedDelivery` | Date | R | |
| `subtotalCents`, `shippingCents`, `taxCents`, `totalCents` | Number | R | Copied from the final quote. `totalCents` must equal the PaymentIntent amount |
| `currency` | String | default `"usd"` | |
| `status` | String | enum `pending_payment` \| `paid` \| `shipped` \| `delivered` \| `cancelled` | Fulfillment status |
| `paymentStatus` | String | enum `unpaid` \| `paid` \| `refunded` \| `partially_refunded` | Money status. Mirrors `payments.status` and the refund total |
| `payment` | ObjectId → payments | | |
| `paymentMethod` | `{ brand, last4 }` | | Copied from the payment for display ("Visa •••• 4242") |
| `statusHistory` | [{ `status`, `at`, `note` }] | | Order detail timeline |
| `reservationExpiresAt` | Date \| null | | `createdAt + 30 min` while `pending_payment`. Cleared when the order is paid |
| `paidAt`, `shippedAt`, `deliveredAt`, `cancelledAt` | Date | | |
| `cancelReason` | String | enum `user_cancelled` \| `reservation_expired` \| `admin_cancelled` | |

**OrderItem** (no own `_id`)

| Field | Type | Notes |
|---|---|---|
| `product` | ObjectId → products | For links and "Buy it again" |
| `variantId` | ObjectId | |
| `title`, `variantLabel`, `image`, `sku` | String | Snapshot |
| `unitPriceCents` | Number | Snapshot |
| `qty` | Number | |
| `lineTotalCents` | Number | `unitPriceCents × qty` |

**Order status transitions** (enforced in `order.service.js`; any other transition throws):

```
pending_payment ──(payment_intent.succeeded)──► paid ──(dev script)──► shipped ──(dev script)──► delivered
       │                                         │
       ├──(30 min unpaid, PI cancelled)──────────┤
       └──(user cancels)─────────────────────────┴──► cancelled      (stock released; paid → refund)
```

A **declined card does not cancel the order.** The payment records the error, and the user can retry with the same PaymentIntent until the reservation expires.

### 5.8 `payments`

There is one document per order, matching **one Stripe PaymentIntent**. A retry after a declined card reuses the same PaymentIntent, so it doesn't create a new document.

| Field | Type | Rules | Notes |
|---|---|---|---|
| `order` | ObjectId → orders | R, U | |
| `user` | ObjectId → users | R | |
| `provider` | String | default `"stripe"` | |
| `stripePaymentIntentId` | String | R, U | `pi_...` |
| `amountCents` | Number | R | Equal to `order.totalCents` |
| `currency` | String | R, default `"usd"` | |
| `status` | String | enum `requires_payment_method` \| `requires_action` \| `processing` \| `succeeded` \| `canceled` | Mirrors the PaymentIntent status. It is updated **only by webhooks** (or the expiry job), never by the client |
| `failedAttempts` | Number | default 0 | Increased on `payment_intent.payment_failed` |
| `lastError` | `{ code, declineCode, message, at }` \| null | | From `last_payment_error`. Shown to the user on retry |
| `card` | `{ brand, last4, expMonth, expYear, country }` \| null | | From the successful charge's `payment_method_details.card` |
| `stripeChargeId` | String \| null | | `latest_charge` |
| `receiptUrl` | String \| null | | Stripe receipt link shown on the order page |
| `amountRefundedCents` | Number | default 0 | |
| `refunds` | [{ `stripeRefundId`, `amountCents`, `status`, `reason`, `createdAt` }] | | Embedded. A charge has only a few refunds |
| `succeededAt`, `canceledAt` | Date \| null | | |
| `lastEventId` | String | | The most recent `stripeEvents.eventId` applied, for debugging |

**Never stored:** card numbers, CVC, or the PaymentIntent `client_secret`. Card details go straight from the browser to Stripe Elements. The `client_secret` is returned to the client when it is needed and fetched again from Stripe for a retry.

### 5.9 `stripeEvents`

This collection records every webhook event that Stripe sends, so that an event delivered twice is only processed once.

| Field | Type | Rules | Notes |
|---|---|---|---|
| `eventId` | String | R, U | `evt_...` |
| `type` | String | R | e.g. `payment_intent.succeeded` |
| `objectId` | String | | `data.object.id` (`pi_...`, `ch_...`, `re_...`) |
| `livemode` | Boolean | | Should always be `false` while the app runs in test mode |
| `status` | String | enum `received` \| `processed` \| `ignored` \| `failed` | |
| `error` | String \| null | | Error message if processing failed |
| `attempts` | Number | default 1 | Increased each time Stripe redelivers the event |
| `receivedAt` | Date | R | TTL: deleted after 90 days |
| `processedAt` | Date \| null | | |

**Handled event types**

| Event | Action |
|---|---|
| `payment_intent.succeeded` | payment → `succeeded` + card details. Order → `paid`, `paymentStatus: paid`, stock reservation cleared, `salesCount` increased, cart items removed (if the order came from the cart) |
| `payment_intent.payment_failed` | payment → `requires_payment_method`, `failedAttempts++`, `lastError`. **The order stays `pending_payment`** |
| `payment_intent.processing` / `requires_action` | payment → matching status |
| `payment_intent.canceled` | payment → `canceled`. If the order is still `pending_payment`, cancel it and release stock |
| `charge.refunded` | Update `refunds[]` and `amountRefundedCents`. Order `paymentStatus` → `refunded` or `partially_refunded` |
| anything else | Stored with `status: ignored` |

---

## 6. Indexes

| Collection | Index | Options | Used by |
|---|---|---|---|
| `users` | `{ email: 1 }` | unique | Sign in, sign up |
| `categories` | `{ slug: 1 }` | unique | `/c/:slug` |
| `categories` | `{ parent: 1, isActive: 1, sortOrder: 1 }` | | Category tree, nav |
| `categories` | `{ "source.provider": 1, "source.externalId": 1 }` | unique, partial (`externalId` is a string) | Import |
| `products` | `{ slug: 1 }` | unique | Product page |
| `products` | `{ "variants.sku": 1 }` | unique | SKU integrity |
| `products` | `{ "source.provider": 1, "source.externalId": 1 }` | unique, partial (`externalId` is a string) | Import |
| `products` | Text: `{ title: 10, brand: 5, tags: 3, description: 1 }` | `name: "product_text"` | Shopper search, admin search |
| `products` | `{ category: 1, status: 1, minPriceCents: 1 }` | | Category listing + price |
| `products` | `{ department: 1, status: 1, minPriceCents: 1 }` | | Department listing + price |
| `products` | `{ category: 1, status: 1, ratingAvg: -1 }` | | Rating sort within a category |
| `products` | `{ status: 1, salesCount: -1 }` | | Best Sellers, relevance |
| `products` | `{ department: 1, status: 1, ratingAvg: -1 }` | | Top Rated in {dept} |
| `products` | `{ status: 1, maxDiscountPercent: -1 }` | | Today's Deals |
| `products` | `{ status: 1, publishedAt: -1 }` | | New Arrivals, newest |
| `products` | `{ brand: 1 }` | | Brand filter and facet |
| `products` | `{ status: 1, updatedAt: -1 }` | | Admin product list |
| `reviews` | `{ product: 1, createdAt: -1 }` | | Product reviews |
| `reviews` | `{ product: 1, user: 1 }` | unique, partial (`user` exists) | One review per user (future) |
| `carts` | `{ user: 1 }` | unique | |
| `checkouts` | `{ user: 1, status: 1 }` | | Find the open checkout |
| `checkouts` | `{ expiresAt: 1 }` | TTL `expireAfterSeconds: 0`, partial `{ status: "open" }` | Remove abandoned checkouts |
| `orders` | `{ orderNumber: 1 }` | unique | |
| `orders` | `{ checkout: 1 }` | unique | One order per checkout |
| `orders` | `{ user: 1, createdAt: -1 }` | | Order history |
| `orders` | `{ status: 1, reservationExpiresAt: 1 }` | partial `{ status: "pending_payment" }` | Expiry job |
| `payments` | `{ stripePaymentIntentId: 1 }` | unique | Webhook lookup |
| `payments` | `{ order: 1 }` | unique | |
| `payments` | `{ user: 1, createdAt: -1 }` | | |
| `stripeEvents` | `{ eventId: 1 }` | unique | Process each event only once |
| `stripeEvents` | `{ receivedAt: 1 }` | TTL 90 days | Cleanup |
| `stripeEvents` | `{ status: 1, receivedAt: -1 }` | partial `{ status: "failed" }` | Find failed events |

Indexes are declared in the schemas and created with `Model.syncIndexes()` during seeding. `autoIndex` is turned off in production. For search, `$text` is enough for a catalog of a few hundred products. Atlas Search is the upgrade path if typo tolerance or autocomplete is needed later.

---

## 7. How the Data Supports the Main Flows

### 7.1 Homepage

Every shopper query includes `{ status: "active" }` and excludes inactive categories.

| Section | Query |
|---|---|
| Header, "All" sidebar, category tiles | `categories.find({ isActive: true }).sort({ level: 1, sortOrder: 1 })`, cached on the client. A category without an `image` uses the first image of its best-selling active product, and a department uses its first category's image |
| Best Sellers | `products.find({ status: "active" }).sort({ salesCount: -1 }).limit(12)` |
| New Arrivals | `…sort({ publishedAt: -1 }).limit(12)` |
| Top Rated in {dept} | `products.find({ department, status: "active" }).sort({ ratingAvg: -1 }).limit(12)` |
| Deals | `products.find({ status: "active", maxDiscountPercent: { $gte: 10 } }).sort({ maxDiscountPercent: -1 })` |

### 7.2 Search / Category listing

| Param | Filter |
|---|---|
| `q` | `{ $text: { $search: q } }` |
| `category` (slug) | Department → `{ department: id }`. Category → `{ category: id }` |
| `minPrice`, `maxPrice` | `{ minPriceCents: { $gte, $lte } }` |
| `rating` | `{ ratingAvg: { $gte } }` |
| `brand` | `{ brand: { $in } }` |
| `inStock=true` | `{ inStock: true }` |
| always | `{ status: "active" }` |

| `sort` | Mongo sort |
|---|---|
| `relevance` | With `q`: `{ score: { $meta: "textScore" }, salesCount: -1 }`. Without `q`: `{ salesCount: -1 }` |
| `price_asc` / `price_desc` | `{ minPriceCents: ±1 }` |
| `rating` | `{ ratingAvg: -1, ratingCount: -1 }` |
| `newest` | `{ publishedAt: -1 }` |

Pagination uses `skip`/`limit` (24 per page) and `countDocuments`. The brand facet runs `distinct("brand", filterWithoutBrand)`.

**Search suggestions** (`GET /products/suggestions?q=&category=`), called by the search bar as the user types (debounced 300 ms):

- Products: the shopper filter (+ department/category scope) and `$or` of a case-insensitive word-prefix regex on `title`, `brand`, `tags`, sorted `{ salesCount: -1 }`, limit 20. The `{ status: 1, salesCount: -1 }` index drives the sort, so the scan stops after 20 matches. `$text` can't be used here because it only matches whole (stemmed) words.
- Terms: built from those 20 products: the matched word plus up to 2 following words, from brands (except `"Generic"`), tags, and titles. Lowercased, deduplicated, max 6.
- Categories: matched by name against the cached category tree (no extra query), max 4.
- Response: `{ terms, categories: [{ _id, name, slug, department }], products: [{ _id, slug, title, image, priceCents }] }`, `Cache-Control: public, max-age=60`.
- Upgrade path: Atlas Search autocomplete for typo tolerance.

### 7.3 Product details

- `products.findOne({ slug, status: "active" })` returns the whole page in one read. Only active variants are shown.
- The selected variant is `?v=` if it is valid, otherwise the `isDefault` variant.
- The stock message comes from `variant.stock`: 0 shows "Currently unavailable", 1–5 shows "Only N left in stock", and higher shows "In Stock".
- Reviews come from a separate paginated query. The histogram uses `ratingBreakdown`. Related products: same `category`, sorted by `salesCount`.

### 7.4 Cart

- **Guest:** items are kept in localStorage. `POST /api/cart/preview` fills in their details without saving anything.
- **Signed in:** `carts.findOne({ user })` + one `products.find({ _id: { $in } })` to fill in details.
- **Add:** upsert. If the variant is already in the cart its `qty` is increased, capped at stock and 30.
- **Merge on sign in:** each guest item is added with the same rule.

### 7.5 Checkout and Stripe payment

```
Client                          API                                   MongoDB                     Stripe
  │ open /checkout                │                                      │                           │
  │──POST /checkout {source}─────►│ delete user's other open checkouts   │                           │
  │                               │ copy items, quote ──────────────────►│ checkouts (open)          │
  │◄────── checkout + quote ──────│                                      │                           │
  │──PATCH /checkout/:id ────────►│ address / delivery → re-quote ──────►│ checkouts                 │
  │  {addressId, deliveryMethod}  │                                      │                           │
  │──POST /checkout/:id/place ───►│ ① recalculate quote; total ≠ expectedTotalCents → 409 price_changed
  │  {expectedTotalCents}         │ ② TRANSACTION ──────────────────────►│ products: $inc stock -qty │
  │                               │    (stock check, conditional $inc)   │ orders (pending_payment)  │
  │                               │                                      │ checkouts (completed)     │
  │                               │ ③ create PaymentIntent ─────────────────────────────────────────►│
  │                               │    idempotencyKey = "pi-" + orderId, amount = totalCents,        │
  │                               │    metadata { orderId, orderNumber, userId }                     │
  │                               │ ④ insert payment ───────────────────►│ payments                  │
  │◄── { orderNumber, clientSecret }                                     │                           │
  │──stripe.confirmCardPayment(clientSecret, card) ─────────────────────────────────────────────────►│
  │                               │◄──────────── POST /webhooks/stripe (payment_intent.*) ───────────│
  │                               │ ⑤ verify signature, insert stripeEvents (unique eventId)         │
  │                               │ ⑥ apply event in a TRANSACTION ─────►│ payments, orders,         │
  │                               │                                      │ products.salesCount, carts│
  │──GET /orders/:orderNumber (poll until paid)─►│                       │                           │
```

**Step details**

1. **Recalculating the price.** The final quote is calculated from current prices. If it differs from what the user saw, nothing is written and the user must confirm the new total.
2. **Order transaction.** For each item:
   `products.updateOne({ _id, variants: { $elemMatch: { _id: variantId, isActive: true, stock: { $gte: qty } } }, status: "active" }, { $inc: { "variants.$.stock": -qty } })`.
   If `modifiedCount === 0`, the transaction is aborted and the API returns `409 out_of_stock` with the affected items. Then `syncStockFields`, insert the order (`checkout` is unique, so a repeated request returns the existing order), and set the checkout to `completed`.
3. **PaymentIntent.** It is created after the commit, using a Stripe idempotency key so a retried request can't create a second PaymentIntent. If Stripe fails, the order stays `pending_payment` with no payment, and the client can call `POST /orders/:orderNumber/payment-intent` to create the PaymentIntent again (same idempotency key).
4. **Payment document.** Inserted with `status: requires_payment_method`.
5. **Webhook receipt.** Steps, in order:
   1. `stripe.webhooks.constructEvent(rawBody, signature, secret)`. If it fails, return 400.
   2. Insert into `stripeEvents`. If the `eventId` already exists and was `processed`, return 200 without doing anything.
   3. Process the event, then mark it `processed`, or `failed` and return 500 so Stripe retries.
6. **Applying `succeeded`.** Checks before marking the order paid:
   - `amount_received === order.totalCents` and the currency matches
   - the order is still `pending_payment`

   If the order was already cancelled (the payment arrived just after the reservation expired), it is **refunded automatically** and logged.

**Retrying a declined card:** `payment_failed` updates `lastError` on the payment. The client shows the message and calls `confirmCardPayment` again with the **same** `clientSecret`, so the order and the reserved stock stay the same.

**Reservation expiry** (job, every 60 s):
1. Find `orders` with `{ status: "pending_payment", reservationExpiresAt: { $lt: now } }`.
2. Call `stripe.paymentIntents.cancel(pi)`. If the PaymentIntent is already `succeeded` or `processing`, skip the order and let the webhook settle it.
3. In a transaction:
   - release the stock (`$inc +qty`)
   - order → `cancelled` (`reservation_expired`)
   - payment → `canceled`

**User cancel** (`pending_payment` or `paid`):
- Release the stock in a transaction and set the order to `cancelled`.
- If it was paid, call `stripe.refunds.create({ payment_intent })`. The `charge.refunded` webhook then updates the payment and `paymentStatus`.

### 7.6 Order confirmation

`orders.findOne({ orderNumber, user })`. The page polls every 2 s, for up to 20 s, until the order is `paid`. If `payment.lastError` is set, it shows the error and offers a retry.

### 7.7 Account and orders

- Order history: `orders.find({ user, createdAt: { $gte } }).sort({ createdAt: -1 })`.
- The order detail page joins `payments` for the card, receipt URL, and refunds.
- Buy it again: adds the items' `product`/`variantId` to the cart if the product is active and the variant is active and in stock.

### 7.8 Admin catalog management

All admin routes require `role: "admin"`. Every write sets `updatedBy`, and create sets `createdBy` too.

| Action | Data operation |
|---|---|
| List products | `products.find(filter)` by `status`, `category`, text `q`; sort `updatedAt: -1`; paginated. Shows stock and price ranges |
| Create product | Insert with `status: "draft"`, `source.provider: "manual"`. Hooks generate the slug and set `department` and the calculated fields |
| Edit product / variants | `findById` → apply changes → `save()`, which runs the validation and calculation hooks. Variants that have been ordered can only be deactivated |
| Publish / archive | `status` → `active` / `archived`. Publishing needs at least 1 image and at least 1 active variant with price > 0 |
| Upload image | `POST /api/admin/uploads` → Cloudinary `amazon-clone/products/<productId>/` → returns `{ url, publicId }`, which the client adds to `images` |
| Create / edit category | Validate the slug is unique and `parent` is a department. Moving a category updates its products' `department` in a transaction |
| Delete category | Only if no products and no child categories reference it |
| Delete review | Remove it, then recalculate `ratingAvg`, `ratingCount`, and `ratingBreakdown` |

### 7.9 Authentication

- Sign up: check the email is unique, then create the user with the bcrypt hash.
- Sign in: `findOne({ email }).select("+passwordHash")`, then `bcrypt.compare`.
- The JWT contains only `{ sub: userId }`. `protect` loads the user on every request, so a role change or deleted account takes effect immediately.

---

## 8. Seed Output Summary

| Collection | Documents | Source |
|---|---|---|
| `categories` | 28 (6 + 22) | `categoryMap.js` + DummyJSON categories |
| `products` | 184, all `active` | DummyJSON snapshot, transformed |
| variants (embedded) | ~310 | Generated (§3.6) |
| `reviews` | ~1,600 | 552 from DummyJSON + generated |
| `users` | 2 | `demo@example.com` (user), `admin@example.com` (admin) |
| `orders` + `payments` | 4 + 4 | Demo user, one each in `paid`, `shipped`, `delivered`, `cancelled`. Payments are seeded with fake `pi_seed_…` ids |
| `checkouts` | 4 | One `completed` checkout per seeded order, since `orders.checkout` is required |
| `carts`, `stripeEvents` | 0 | Created at runtime |
| Cloudinary images | 424 | Uploaded to `amazon-clone/products/<slug>/<n>` |
