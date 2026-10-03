# Database Schema

This document defines the MongoDB collections for the Amazon clone: their fields, the relationships between them, the indexes they need, and how they support each of the app's main flows. Product and category data comes from the DummyJSON products API (see section 2).

Related docs: [01-initial-plan.md](01-initial-plan.md), [02-project-structure.md](02-project-structure.md), [04-development-phases.md](04-development-phases.md).

---

## 1. Overview

| Collection | Purpose | Approx. size (seeded) |
|---|---|---|
| `users` | Accounts, credentials, saved addresses | 2 seeded (demo + admin), grows with sign-ups |
| `categories` | Two-level category tree (department → category) | 6 departments + 22 categories |
| `products` | Catalog, with variants embedded | 184 |
| `reviews` | Product reviews | ~1,600 (3–15 per product) |
| `carts` | One cart per signed-in user | 1 per user |
| `orders` | Placed orders with item and address snapshots | Seeded history for the demo user, then grows |

General conventions:

- All monetary values are **integer cents** (`priceCents: 1999` = $19.99).
- All collections have `createdAt` / `updatedAt` (Mongoose `timestamps: true`).
- References use `ObjectId` with `ref` so `populate()` works.
- Data is **embedded** when it is always read together with its parent and is bounded in size (variants, cart items, order items, addresses). Data is **referenced** when it grows without bound or is read on its own (reviews, orders).
- The guest cart is **not** stored in MongoDB. It lives in the browser (Redux + localStorage) and is merged into `carts` when the guest signs in.

---

## 2. Source Data: DummyJSON

### 2.1 Endpoints tested (2026-10-04)

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

Rate limit: the API returns `x-ratelimit-limit: 100`. Because `limit=0` returns the whole catalog in a single call, the seed needs only 2 API calls (products and categories).

**The live API is used only to build the seed.** The app never calls DummyJSON at runtime. The seed script reads a cached copy in `server/src/seed/data/` (`npm run seed:fetch` refreshes it), so seeding still works if DummyJSON is down or changes.

### 2.2 DummyJSON product shape

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

### 2.3 What the data looks like, and what the seed has to fix

| Finding | Impact | How the seed handles it |
|---|---|---|
| 194 products, 24 flat categories, no hierarchy | Amazon uses departments with sub-categories | Map the 24 categories into 6 departments (section 2.4) |
| `vehicle` (5) and `motorcycle` (5) cost $3k–$37k | Not realistic for a cart and checkout | **Excluded.** 184 products remain |
| **No variants** | The product page and cart are designed around variants | Generate variants per category (section 2.5) |
| `brand` missing on 92 of 194 (all groceries, kitchen, sports, tops, dresses, jewellery, home decor) | The brand filter would show blanks | Default to `"Generic"` |
| Exactly 3 reviews per product, all dated 2025-04-30, and the source `rating` doesn't match their average | Thin and inconsistent review data | Keep the 3 source reviews, add 0–12 generated ones (faker) with ratings skewed toward the source `rating` and dates spread over the past 18 months, then compute `ratingAvg` from the stored reviews |
| No "About this item" bullets | The product page needs bullets | Split `description` into sentences, then add warranty, return policy, and shipping as extra bullets |
| `price` is the selling price and `discountPercentage` is 0.04–19.61% | Amazon shows a strikethrough "List" price | `listPriceCents = round(price / (1 - discount/100) * 100)`. It is shown only when the discount is at least 5% |
| `stock` 0–100, 4 products at 0 | Out-of-stock states can be tested | Split stock across the generated variants |
| `minimumOrderQuantity` up to 48 | Doesn't fit retail shopping | Ignored |
| One duplicate title: "Rolex Cellini Moonphase" (ids 96 men's, 191 women's) | Slug collision | Add a suffix to the duplicate slug (`-2`) |
| 41 image URLs contain `'`, `&`, or spaces | Requests fail without encoding | `encodeURI()` before fetching or uploading |
| `meta.barcode`, `qrCode`, `reviewerEmail` | Not needed | Dropped |
| No sales data | "Best Sellers" needs a ranking | Seed `salesCount` with a random value weighted by rating and review count |

### 2.4 Category mapping (24 → 6 departments, 22 categories)

| Department (`level 0`) | Categories (`level 1`) ← DummyJSON slug | Products |
|---|---|---|
| **Electronics** | Smartphones ← `smartphones` · Laptops ← `laptops` · Tablets ← `tablets` · Mobile Accessories ← `mobile-accessories` | 38 |
| **Fashion** | Men's Shirts ← `mens-shirts` · Men's Shoes ← `mens-shoes` · Men's Watches ← `mens-watches` · Women's Tops ← `tops` · Women's Dresses ← `womens-dresses` · Women's Shoes ← `womens-shoes` · Women's Bags ← `womens-bags` · Women's Jewelry ← `womens-jewellery` · Women's Watches ← `womens-watches` · Sunglasses ← `sunglasses` | 49 |
| **Home & Kitchen** | Furniture ← `furniture` · Home Décor ← `home-decoration` · Kitchen & Dining ← `kitchen-accessories` | 40 |
| **Grocery** | Grocery & Gourmet Food ← `groceries` | 27 |
| **Sports & Outdoors** | Sports & Fitness ← `sports-accessories` | 17 |
| **Beauty & Personal Care** | Makeup ← `beauty` · Fragrances ← `fragrances` · Skin Care ← `skin-care` | 13 |
| *(excluded)* | `vehicle`, `motorcycle` | 10 |

This mapping lives in `server/src/seed/categoryMap.js`.

### 2.5 Variant generation rules

The product images show one color per product, so the seed varies **size and configuration only**, never color. Every product's images stay accurate for all of its variants.

| Categories | Option | Values | Price rule |
|---|---|---|---|
| Men's Shirts, Women's Tops, Women's Dresses | Size | S, M, L, XL | Same price |
| Men's Shoes | Size | US 8, 9, 10, 11, 12 | Same price |
| Women's Shoes | Size | US 5, 6, 7, 8, 9 | Same price |
| Smartphones, Tablets | Storage | 128 GB, 256 GB, 512 GB | +$0 / +$100 / +$200 |
| Laptops | Configuration | 16 GB / 512 GB, 32 GB / 1 TB | +$0 / +$300 |
| Everything else | none | One default variant labelled "Standard" | Source price |

- Variant SKU = source SKU + suffix (`BEA-ESS-ESS-001`, `MEN-XYZ-001-M`, `SMA-APP-IPH-005-256`).
- The source `stock` is split randomly across the variants. About 10% of variants get stock 0, so "Currently unavailable" and "Only N left" can be tested. Products with source stock 0 get 0 on every variant.
- The first in-stock variant is marked `isDefault`.

---

## 3. Relationships

```
                    ┌──────────────┐
                    │  categories  │◄──┐ parent (self-ref, null for departments)
                    └──────┬───────┘───┘
         department, category │ (N:1)
                    ┌──────▼───────┐ 1      N ┌───────────┐
                    │   products   │◄─────────┤  reviews  │──┐
                    │  └ variants[]│          └───────────┘  │ user (N:1, optional)
                    └──────▲───────┘                         │
   items[].product,        │                                 │
   items[].variantId (N:1) │                                 ▼
          ┌────────────────┴───┐              ┌──────────────────┐
          │       carts        │──── user ───►│      users       │
          │  └ items[]         │  (1:1)       │  └ addresses[]   │
          └────────────────────┘              └────────▲─────────┘
          ┌────────────────────┐   user (N:1)          │
          │       orders       │───────────────────────┘
          │  └ items[] (snapshot, keeps product/variant ids for "Buy it again")
          │  └ shippingAddress (snapshot)
          └────────────────────┘
```

| From | To | Type | Stored as | Notes |
|---|---|---|---|---|
| `categories.parent` | `categories` | N:1 | ObjectId | `null` for departments |
| `products.department` | `categories` (level 0) | N:1 | ObjectId | Denormalized so filtering by department needs no lookup |
| `products.category` | `categories` (level 1) | N:1 | ObjectId | |
| `products.variants` | (embedded) | 1:N | subdocuments | Max ~5 per product |
| `reviews.product` | `products` | N:1 | ObjectId | Kept separate because reviews are paginated and unbounded |
| `reviews.user` | `users` | N:1 | ObjectId \| null | `null` for seeded reviewers, who only have an `authorName` |
| `users.addresses` | (embedded) | 1:N | subdocuments | Max 10 |
| `carts.user` | `users` | 1:1 | ObjectId (unique) | |
| `carts.items[].product` + `variantId` | `products` / variant | N:1 | ObjectId + ObjectId | Prices and stock are read live from the product |
| `orders.user` | `users` | N:1 | ObjectId | |
| `orders.items[]` | `products` / variant | N:1 | ObjectId + snapshot fields | Display uses the snapshot. The ids are only used for "Buy it again" and links |

---

## 4. Collections

Types use Mongoose terms. **R** = required, **U** = unique.

### 4.1 `users`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `name` | String | R, trim, 2–50 chars | |
| `email` | String | R, U, lowercase, trim | Login identifier |
| `passwordHash` | String | R, `select: false` | bcrypt, cost 12. Never returned by the API |
| `role` | String | enum `user` \| `admin`, default `user` | `admin` is used for `/api/uploads` only |
| `addresses` | [Address] | max 10 | Embedded, see below |
| `createdAt`, `updatedAt` | Date | auto | |

**Address** (subdocument, has its own `_id`)

| Field | Type | Rules |
|---|---|---|
| `fullName` | String | R |
| `line1` | String | R |
| `line2` | String | optional |
| `city` | String | R |
| `state` | String | R |
| `zip` | String | R, 5-digit or ZIP+4 |
| `country` | String | R, default `"US"` |
| `phone` | String | R |
| `isDefault` | Boolean | default `false`. At most one per user, enforced in the service layer |

### 4.2 `categories`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `name` | String | R | "Electronics", "Smartphones" |
| `slug` | String | R, U | Used in URLs: `/c/electronics`, `/c/smartphones` |
| `parent` | ObjectId → categories | default `null` | `null` = department |
| `level` | Number | 0 \| 1 | 0 = department, 1 = category |
| `image` | `{ url, publicId }` | optional | Tile image for the homepage and category page (taken from the first product's image) |
| `sortOrder` | Number | default 0 | Order in the nav and sidebar |
| `sourceSlugs` | [String] | | DummyJSON slugs mapped to this category (seed only) |

The whole category tree is 28 documents. The client loads it once (`GET /api/categories`) and keeps it cached for the header, the "All" sidebar, and the filter sidebar.

### 4.3 `products`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `title` | String | R, trim | |
| `slug` | String | R, U | `/p/:slug` |
| `brand` | String | R, default `"Generic"` | Used by the brand filter |
| `department` | ObjectId → categories | R | Level-0 category |
| `category` | ObjectId → categories | R | Level-1 category |
| `description` | String | R | |
| `bullets` | [String] | | "About this item" |
| `tags` | [String] | | Included in text search |
| `images` | [{ `url`, `publicId`, `alt` }] | R, min 1 | Cloudinary. The first image is the card image, and thumbnails come from Cloudinary transforms |
| `optionName` | String \| null | | `"Size"`, `"Storage"`, `"Configuration"`, or `null` for single-variant products |
| `variants` | [Variant] | R, min 1 | See below |
| `specs` | `{ weightOz, dimensions: { width, height, depth }, warranty, returnPolicy, shippingNote }` | | "Product information" table on the product page |
| `ratingAvg` | Number | 0–5, 1 decimal | Recomputed when reviews change |
| `ratingCount` | Number | default 0 | |
| `ratingBreakdown` | `{ 1: Number, 2: …, 5: … }` | | Rating histogram on the product page |
| `minPriceCents` | Number | R | Lowest price across variants. Used to filter and sort by price |
| `maxPriceCents` | Number | R | |
| `maxDiscountPercent` | Number | | For the "% off" badge on cards |
| `totalStock` | Number | | Sum of variant stock |
| `inStock` | Boolean | | `totalStock > 0`. Used by the "In stock" filter |
| `salesCount` | Number | default 0 | "Best Sellers" ranking and relevance tie-break. Incremented when an order is paid |
| `isActive` | Boolean | default `true` | Inactive products are hidden from listing and search |
| `source` | `{ provider: "dummyjson", id: Number }` | | Lets the seed update existing products instead of duplicating them |

**Variant** (subdocument, has its own `_id`, which is the `variantId` used everywhere)

| Field | Type | Rules | Notes |
|---|---|---|---|
| `sku` | String | R, U (index on `variants.sku`) | |
| `label` | String | R | "M", "256 GB", "Standard" |
| `priceCents` | Number | R, ≥ 1 | Selling price |
| `listPriceCents` | Number \| null | ≥ `priceCents` | Strikethrough "List:" price |
| `stock` | Number | R, ≥ 0 | Decremented atomically when an order is created |
| `isDefault` | Boolean | | Selected when `?v=` is missing |

**Keeping the denormalized fields in sync:** `minPriceCents`, `maxPriceCents`, `maxDiscountPercent`, `totalStock`, and `inStock` are recalculated by a `pre('save')` hook. Stock changes made through `updateOne` (order creation and stock release) call `Product.syncStockFields(productId)` in the same transaction.

### 4.4 `reviews`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `product` | ObjectId → products | R | |
| `user` | ObjectId → users \| null | | `null` for seeded reviews |
| `authorName` | String | R | Shown on the review |
| `rating` | Number | R, integer 1–5 | |
| `title` | String | | Generated for seeded reviews |
| `body` | String | R | |
| `verifiedPurchase` | Boolean | default `false` | "Verified Purchase" label |
| `createdAt` | Date | | Seeded reviews get dates spread over 18 months |

Reviews are read-only in the MVP. The rating fields on `products` are calculated by the seed. When review writing is added later, it must also update those fields.

### 4.5 `carts`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `user` | ObjectId → users | R, U | One cart per user, created on first add |
| `items` | [CartItem] | max 50 | |

**CartItem** (subdocument, has its own `_id`, which is the `itemId` in cart routes)

| Field | Type | Rules | Notes |
|---|---|---|---|
| `product` | ObjectId → products | R | |
| `variantId` | ObjectId | R | Must exist in `product.variants` |
| `qty` | Number | R, integer 1–30 | Capped at variant stock when added or merged |
| `savedForLater` | Boolean | default `false` | |
| `addedPriceCents` | Number | R | Price when added, used to show "Price changed from $X" |
| `addedAt` | Date | default now | |

The pair (`product`, `variantId`) is unique within a cart. Adding the same variant again increases its `qty`. When the API returns a cart, it fills in the current title, image, label, price, and stock from `products`, and marks items whose variant is missing or out of stock.

### 4.6 `orders`

| Field | Type | Rules | Notes |
|---|---|---|---|
| `orderNumber` | String | R, U | Amazon-style `112-1234567-1234567`. Used in URLs |
| `user` | ObjectId → users | R | |
| `checkoutId` | String (UUID) | R | Generated by the client per checkout attempt. Unique with `user`, so a double-clicked "Place order" can't create two orders |
| `source` | String | enum `cart` \| `buy_now` | `cart` orders remove the purchased items from the cart once paid |
| `items` | [OrderItem] | R, min 1 | Snapshot, see below |
| `shippingAddress` | Address (no `_id`, no `isDefault`) | R | Snapshot |
| `deliveryMethod` | String | enum `standard` \| `expedited` \| `nextday` | |
| `estimatedDelivery` | Date | R | Set when the order is created |
| `subtotalCents` | Number | R | |
| `shippingCents` | Number | R | |
| `taxCents` | Number | R | 8% of the subtotal |
| `totalCents` | Number | R | |
| `status` | String | enum `pending_payment` \| `paid` \| `shipped` \| `delivered` \| `cancelled` | default `pending_payment` |
| `statusHistory` | [{ `status`, `at` }] | | Timeline on the order detail page |
| `payment` | `{ stripePaymentIntentId, brand, last4 }` | | `brand` and `last4` are filled in by the webhook |
| `reservationExpiresAt` | Date | | `createdAt + 30 min` while `pending_payment` |
| `paidAt`, `shippedAt`, `deliveredAt`, `cancelledAt` | Date | | |
| `cancelReason` | String | | `user_cancelled`, `payment_failed`, `reservation_expired` |

**OrderItem** (subdocument, no own `_id` needed)

| Field | Type | Notes |
|---|---|---|
| `product` | ObjectId → products | For links and "Buy it again" |
| `variantId` | ObjectId | |
| `title` | String | Snapshot |
| `variantLabel` | String | Snapshot ("256 GB") |
| `image` | String | Snapshot (Cloudinary URL) |
| `unitPriceCents` | Number | Snapshot |
| `qty` | Number | |

**Status transitions** (enforced in `order.service.js`):

```
pending_payment ──(webhook: succeeded)──► paid ──(dev script)──► shipped ──(dev script)──► delivered
       │                                   │
       ├──(webhook: failed)────────────────┤
       ├──(30 min, unpaid)─────────────────┼──► cancelled   (stock released)
       └──(user cancels)───────────────────┘
```

---

## 5. Indexes

| Collection | Index | Options | Used by |
|---|---|---|---|
| `users` | `{ email: 1 }` | unique | Sign in, sign up duplicate check |
| `categories` | `{ slug: 1 }` | unique | `/c/:slug`, resolving the search `category` param |
| `categories` | `{ parent: 1, sortOrder: 1 }` | | Building the tree |
| `products` | `{ slug: 1 }` | unique | Product page |
| `products` | `{ "variants.sku": 1 }` | unique | SKU integrity |
| `products` | `{ "source.provider": 1, "source.id": 1 }` | unique, sparse | Seed upserts |
| `products` | Text: `{ title: 10, brand: 5, tags: 3, description: 1 }` | weights as shown, `name: "product_text"` | Search box (`$text`) |
| `products` | `{ category: 1, isActive: 1, minPriceCents: 1 }` | | Category listing + price filter/sort |
| `products` | `{ department: 1, isActive: 1, minPriceCents: 1 }` | | Department listing + price filter/sort |
| `products` | `{ category: 1, ratingAvg: -1 }` | | "Top rated in X", rating sort |
| `products` | `{ salesCount: -1 }` | | Best Sellers row, default relevance |
| `products` | `{ createdAt: -1 }` | | New Arrivals row, newest sort |
| `products` | `{ brand: 1 }` | | Brand filter + brand facet |
| `reviews` | `{ product: 1, createdAt: -1 }` | | Paginated reviews on the product page |
| `reviews` | `{ product: 1, user: 1 }` | unique, partial (`user` exists) | One review per user per product (future) |
| `carts` | `{ user: 1 }` | unique | Load cart |
| `orders` | `{ orderNumber: 1 }` | unique | Confirmation and detail pages |
| `orders` | `{ user: 1, createdAt: -1 }` | | Order history |
| `orders` | `{ user: 1, checkoutId: 1 }` | unique | Prevents duplicate orders from double clicks |
| `orders` | `{ "payment.stripePaymentIntentId": 1 }` | unique, sparse | Webhook lookup |
| `orders` | `{ status: 1, reservationExpiresAt: 1 }` | partial (`status: "pending_payment"`) | Expiry job |

Indexes are declared in the schemas (`schema.index(...)`) and created with `Model.syncIndexes()` during seeding. `autoIndex` is turned off in production.

A note on search: MongoDB's `$text` is enough for 184 products, but it has no typo tolerance or autocomplete. If those are needed later, the upgrade is **Atlas Search**, which needs no schema changes.

---

## 6. How the Data Supports the Main Flows

### 6.1 Homepage

| Section | Query |
|---|---|
| Header, "All" sidebar, category tiles | `categories.find().sort({ level: 1, sortOrder: 1 })`, loaded once and cached on the client |
| Best Sellers row | `products.find({ isActive: true }).sort({ salesCount: -1 }).limit(12)` |
| New Arrivals row | `…sort({ createdAt: -1 }).limit(12)` |
| Top Rated in {department} | `products.find({ department, isActive: true }).sort({ ratingAvg: -1 }).limit(12)` for 2–3 departments |
| Deals row | `products.find({ maxDiscountPercent: { $gte: 10 } }).sort({ maxDiscountPercent: -1 })` |

All rows come from a single endpoint, `GET /api/products/home`, and only return the card fields (`title, slug, images.0, minPriceCents, maxDiscountPercent, ratingAvg, ratingCount`).

### 6.2 Search / Category listing

`GET /api/products` converts the query parameters into a single `find()`:

| Param | Filter |
|---|---|
| `q` | `{ $text: { $search: q } }` |
| `category` (slug) | Resolve the slug. A department filters on `{ department: id }`, and a category filters on `{ category: id }` |
| `minPrice`, `maxPrice` (dollars) | `{ minPriceCents: { $gte, $lte } }` |
| `rating` | `{ ratingAvg: { $gte: rating } }` |
| `brand` (comma list) | `{ brand: { $in: [...] } }` |
| `inStock=true` | `{ inStock: true }` |
| always | `{ isActive: true }` |

| `sort` | Mongo sort |
|---|---|
| `relevance` (default) | With `q`: `{ score: { $meta: "textScore" }, salesCount: -1 }`. Without `q`: `{ salesCount: -1 }` |
| `price_asc` / `price_desc` | `{ minPriceCents: 1 \| -1 }` |
| `rating` | `{ ratingAvg: -1, ratingCount: -1 }` |
| `newest` | `{ createdAt: -1 }` |

Pagination uses `skip`/`limit` (24 per page), and the total comes from `countDocuments`. The brand facet runs `distinct("brand", filter)`, where `filter` is the query without the brand condition, so the user can still select other brands. Two pieces of data support the filter sidebar: the category tree it gets from `categories`, and the brands this query returns.

### 6.3 Product details

- `products.findOne({ slug, isActive: true })` returns everything on the page, including all variants, in one read.
- The selected variant comes from `?v=variantId` if present, otherwise the `isDefault` variant.
- The stock message comes from `variant.stock`: 0 shows "Currently unavailable", 1–5 shows "Only N left in stock", and higher shows "In Stock".
- Reviews come from a separate paginated call: `reviews.find({ product }).sort({ createdAt: -1 })`. The histogram uses `product.ratingBreakdown`.
- "More from {category}": `products.find({ category, _id: { $ne } }).sort({ salesCount: -1 }).limit(8)`.

### 6.4 Cart

- **Guest:** items `{ productId, variantId, qty }` are kept in localStorage. To display them, the client calls `POST /api/cart/preview`, which fills in current details for each item without saving anything.
- **Signed in:** `carts.findOne({ user })`, then one `products.find({ _id: { $in: productIds } })` to fill in titles, prices, and stock.
- **Add:** `findOneAndUpdate` with upsert. If the variant is already in the cart, its `qty` is increased (capped at stock and 30). Otherwise a new item is pushed.
- **Merge on sign in:** for each guest item, add it to the account cart with the add rule above.
- The subtotal shown in the cart covers only items where `savedForLater: false`, using current prices.

### 6.5 Checkout and payment

1. **Quote** (`POST /api/checkout/quote`): load the items (from the cart, or the single Buy Now item) and the current variant prices, then return subtotal, shipping, tax, and total from `pricing.service`. Nothing is written.
2. **Place order** (`POST /api/orders`): this runs in a **single transaction**:
   - For each item: `products.updateOne({ _id, "variants._id": variantId, "variants.stock": { $gte: qty } }, { $inc: { "variants.$.stock": -qty } })`. If `modifiedCount === 0`, the item is out of stock: abort and return `409` with the affected items.
   - Recalculate the denormalized stock fields of each affected product.
   - Insert the order with snapshots, `status: pending_payment`, and `reservationExpiresAt: now + 30 min`.
   - After the commit, create the Stripe PaymentIntent (`metadata.orderNumber`) and save its id on the order.
3. **Webhook** `payment_intent.succeeded`: find the order by `payment.stripePaymentIntentId`. Only if its status is still `pending_payment`, set it to `paid` with `paidAt` and the card brand and last 4. Then increment `salesCount` for each product and, for `source: cart`, remove the purchased items from the cart. The status check makes webhook retries harmless.
4. **Webhook** `payment_intent.payment_failed`, or the expiry job (every minute, `{ status: "pending_payment", reservationExpiresAt: { $lt: now } }`): in a transaction, put the stock back (`$inc` +qty), set the order to `cancelled`, and record `cancelReason`.

### 6.6 Order confirmation

`orders.findOne({ orderNumber, user: req.user._id })`. Filtering by `user` means one user can never read another user's order. The page polls this endpoint every 2 s, for up to 20 s, until `status` changes from `pending_payment` to `paid`.

### 6.7 Account and orders

- Profile and addresses: `users.findById(req.user._id)`. Addresses are edited with positional updates on `addresses._id`.
- Order history: `orders.find({ user, createdAt: { $gte: rangeStart } }).sort({ createdAt: -1 })`, paginated, using the `{ user, createdAt }` index.
- Cancel: allowed only from `pending_payment` or `paid`. It releases stock in a transaction, and a `paid` order also gets a Stripe refund (`stripe.refunds.create`).
- Buy it again: adds `items[].product` / `variantId` to the cart if the variant still exists and is in stock.

### 6.8 Authentication

- Sign up: check `users.findOne({ email })`, then `users.create` with the bcrypt hash.
- Sign in: `users.findOne({ email }).select("+passwordHash")`, then `bcrypt.compare`.
- The JWT payload is just `{ sub: userId }`. The `protect` middleware loads the user without `passwordHash` (one indexed `_id` read per request).

---

## 7. Seed Output Summary

| Collection | Documents | Source |
|---|---|---|
| `categories` | 28 (6 + 22) | `categoryMap.js` |
| `products` | 184 | DummyJSON, transformed |
| variants (embedded) | ~310 | Generated (section 2.5) |
| `reviews` | ~1,600 | 552 from DummyJSON + generated |
| `users` | 2 | `demo@example.com`, `admin@example.com` |
| `orders` | 4 | Demo user, one in each of `paid`, `shipped`, `delivered`, `cancelled` |
| Cloudinary images | 424 | Uploaded from `cdn.dummyjson.com` to `amazon-clone/products/<slug>/<n>` |
