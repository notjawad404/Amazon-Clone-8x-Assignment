# Amazon Clone: Initial Plan

This document defines the MVP for an Amazon-style store built on the MERN stack. It covers the tech stack, file structure, data model, API, the main technical decisions, and local setup.

---

## 1. Goal

The goal is a working e-commerce store that follows Amazon's main shopping flow from start to finish:

```
Home ─► Search / Category ─► Product Details ─► Cart ─► Sign in (if guest) ─► Checkout ─► Order Confirmation ─► Your Orders
                                   └────────────── Buy Now ──────────────────────────┘
```

The layout copies Amazon's look: a dark top nav, dense product grids, and yellow/orange buttons. The store uses its own name and logo, not Amazon's.

---

## 2. Tech Stack

| Layer | Choice | Used for |
|---|---|---|
| Frontend | React + Vite | SPA, dev server, build |
| Routing | React Router | Page routes, protected routes |
| State | Redux Toolkit + RTK Query | Client state (auth, guest cart, UI) and server data caching |
| Styling | Tailwind CSS | All styling |
| Backend | Node.js + Express | REST API |
| Database | MongoDB (Atlas) | Products, users, carts, orders, reviews |
| ODM | Mongoose | Schemas, validation, queries |
| Auth | JWT (httpOnly cookie) + bcrypt | Sign up, sign in, sign out, protected routes |
| Payments | Stripe (Payment Intents + Elements), test mode | Card payments at checkout |
| Media | Cloudinary | Product images (seeded), uploads via API |
| Validation | Zod | Request body/query validation on the API |
| Seed data | Script using DummyJSON source data | 100+ products, 5+ categories, variants, images, ratings, reviews |

Language: JavaScript (ES modules) on both client and server.

---

## 3. MVP Scope

### 3.1 Pages

| # | Page | Route | MVP features |
|---|---|---|---|
| 1 | Homepage | `/` | Header (logo, category select + search, account menu, cart count), department sub-nav, hero carousel (static promos), category tile grid, product rows: Best Sellers, New Arrivals, Top Rated in a category |
| 2 | Search / Listing | `/s?k=&category=&minPrice=&maxPrice=&rating=&brand=&inStock=&sort=&page=` and `/c/:slug` | Filter sidebar (category, price range, min rating, brand, in stock), sort (relevance, price low→high, price high→low, rating, newest), result count, product cards, pagination. All filter state is kept in the URL |
| 3 | Product Details | `/p/:slug?v=:variantId` | Image gallery with thumbnails, title, brand, rating + count, price with list-price strikethrough and % off, variant selector (price/stock/image update per variant), "About this item" bullets, description, buy box (stock message, delivery estimate, qty, Add to Cart, Buy Now), reviews list |
| 4 | Cart | `/cart` | Line items (image, title, variant, price, qty selector, Delete, Save for later), Saved for later section (Move to cart, Delete), "Subtotal (N items)", Proceed to checkout, price-changed and out-of-stock warnings |
| 5 | Sign in / Sign up | `/signin`, `/signup` | Email + password, `?redirect=` back to the original page, sign out from the account menu |
| 6 | Checkout | `/checkout` | Sign-in required. 1) Shipping address (pick saved or add new), 2) Delivery method (Standard / Expedited / Next Day with estimated dates), 3) Payment (Stripe Card Element), 4) Review items. Order summary sidebar (items, shipping, tax, total), Place order |
| 7 | Order Confirmation | `/order/:orderNumber/confirmation` | Order number, items, shipping address, delivery method + estimated date, price breakdown, links to order details and to continue shopping |
| 8 | Account / Orders | `/account`, `/orders`, `/orders/:orderNumber` | Profile (name, email), saved addresses (add/edit/delete/set default), order list with status and filter by time range, order detail page, Cancel (while not yet shipped), Buy it again |

Also needed: a 404 page, empty states (empty cart, no results, no orders), and loading skeletons.

### 3.2 Business rules

- **Guests can browse and build a cart.** Sign-in is only required at checkout. When a guest signs in, their cart is merged into their account cart. Quantities are added together and capped at available stock.
- **The server computes all prices.** The client sends variant IDs and quantities only. Subtotal, shipping, tax, and total are always calculated on the server.
- **Money is stored as integer cents.**
- **Shipping:** Standard is free for subtotals of $35 or more and $5.99 otherwise. It takes 5 business days. Expedited is $9.99 and takes 2 days. Next Day is $14.99.
- **Tax:** a flat 8% of the subtotal.
- **Orders store a snapshot of each item** (title, variant label, image, unit price) and of the shipping address. Later edits to a product do not change past orders.
- **Stock is reserved when the order is created** and released if payment fails or the order is not paid within 30 minutes.
- **Buy Now** checks out a single item directly and does not change the cart.
- **Order status:** `pending_payment` → `paid` → `shipped` → `delivered`. An order can also become `cancelled` from `pending_payment` or `paid`. In the MVP, shipping and delivery status are moved forward by a dev script (`npm run orders:advance`).

### 3.3 Out of scope for MVP

Seller/marketplace features, admin dashboard UI, recommendation engine, writing reviews, wishlists, returns/refunds UI, email notifications, OAuth login, password reset, multiple currencies or languages, Prime.

---

## 4. Key Technical Decisions

### 4.1 Authentication (JWT)

- On sign in or sign up, the server signs a JWT (`{ sub: userId }`, 7-day expiry) and sets it as a cookie: `httpOnly`, `sameSite=lax`, and `secure` in production. The token is never stored in localStorage.
- The `protect` middleware reads the cookie, verifies the token, and attaches `req.user`.
- `GET /api/auth/me` restores the session when the app loads.
- In development, the Vite dev server proxies `/api` to Express. This makes the frontend and API share an origin, so cookies work without extra CORS setup.
- Passwords are hashed with bcrypt (cost 12). The sign-in endpoint is rate limited.

### 4.2 State management

- **RTK Query** (`api` slice) handles all server data: products, search, cart, orders, addresses. Cache tags (`Cart`, `Orders`, `Addresses`) are invalidated after mutations.
- **`authSlice`** holds the current user and auth status.
- **`guestCartSlice`** holds the cart while the user is signed out. It is saved to localStorage and sent to `POST /api/cart/merge` after sign in, then cleared.
- **`checkoutSlice`** holds the selected address, delivery method, and Buy Now item.

### 4.3 Payments (Stripe)

1. The client calls `POST /api/orders`. The server validates stock, reserves it, creates an order with status `pending_payment`, creates a Stripe PaymentIntent for the server-computed total, and returns `{ orderNumber, clientSecret }`.
2. The client confirms the payment with Stripe Elements (`stripe.confirmCardPayment`).
3. Stripe calls the webhook `POST /api/webhooks/stripe`:
   - On `payment_intent.succeeded`, the order is marked `paid` and the purchased items are removed from the cart.
   - On `payment_intent.payment_failed`, the order is marked `cancelled` and its stock is released.
4. The client goes to the confirmation page, which polls the order until its status is `paid`.

The webhook route uses `express.raw()` and is registered **before** `express.json()` so Stripe signature verification works. Use test card `4242 4242 4242 4242` in development.

### 4.4 Images (Cloudinary)

- The seed script uploads each product image to Cloudinary under `amazon-clone/products/<slug>/`. It uses a deterministic `public_id`, so running the script again does not create duplicates.
- Products store the Cloudinary `url` and `publicId` for each image.
- The frontend requests resized images with Cloudinary transformations (for example, `w_400,f_auto,q_auto` for cards).
- `POST /api/uploads` (multer memory storage → Cloudinary upload stream) is admin-only and exists for adding products later.

### 4.5 Stock reservation and transactions

Order creation runs in a MongoDB transaction. For each item, stock is decremented with a conditional update (`{ _id, stock: { $gte: qty } }`). If any item fails, the whole order is aborted. Transactions need a replica set, so use **MongoDB Atlas**, which includes one, or run a local single-node replica set.

---

## 5. Data Model (Mongoose)

```js
User {
  name, email (unique, lowercase), passwordHash, role: 'user' | 'admin',
  addresses: [{ fullName, line1, line2, city, state, zip, country, phone, isDefault }],
  timestamps
}

Category {
  name, slug (unique), image, parent: ObjectId<Category> | null
}

Product {
  title, slug (unique), brand, category: ObjectId<Category>,
  description, bullets: [String],
  images: [{ url, publicId }],
  variants: [{
    _id, sku (unique), label,                 // e.g. "Black / 128GB"
    attributes: { color, size, ... },
    priceCents, listPriceCents, stock,
    images: [{ url, publicId }]               // optional, falls back to product images
  }],
  ratingAvg, ratingCount,
  minPriceCents,                              // denormalized for sorting and filtering
  inStock,                                    // denormalized: any variant with stock > 0
  timestamps
}
// indexes: text index on { title, brand, description }, { category, minPriceCents }, { ratingAvg }

Review {
  product: ObjectId<Product>, user: ObjectId<User> | null, authorName,
  rating (1-5), title, body, timestamps
}

Cart {
  user: ObjectId<User> (unique),
  items: [{ product, variantId, qty, savedForLater, addedPriceCents }],
  timestamps
}

Order {
  orderNumber (unique, e.g. "112-4839201-5573019"), user: ObjectId<User>,
  items: [{ product, variantId, title, variantLabel, image, unitPriceCents, qty }],
  shippingAddress: { ...snapshot },
  deliveryMethod: 'standard' | 'expedited' | 'nextday', estimatedDelivery: Date,
  subtotalCents, shippingCents, taxCents, totalCents,
  status: 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled',
  payment: { stripePaymentIntentId, last4, brand },
  paidAt, shippedAt, deliveredAt, cancelledAt,
  source: 'cart' | 'buy_now',
  timestamps
}
```

Every product has at least one variant, so the cart and order code only has to handle variants.

---

## 6. API Endpoints

All endpoints are prefixed with `/api`. 🔒 means a signed-in user is required. 🛡 means the admin role is required.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Create an account and set the auth cookie |
| POST | `/auth/signin` | Sign in and set the auth cookie |
| POST | `/auth/signout` | Clear the auth cookie |
| GET | `/auth/me` 🔒 | Current user |
| GET | `/categories` | All categories |
| GET | `/products` | Search/list: `q, category, minPrice, maxPrice, rating, brand, inStock, sort, page, limit` → `{ items, total, page, pages, facets: { brands } }` |
| GET | `/products/home` | Homepage rows (best sellers, new arrivals, top rated) |
| GET | `/products/:slug` | Product detail |
| GET | `/products/:slug/reviews` | Paginated reviews + rating histogram |
| GET | `/cart` 🔒 | Cart with current prices and stock |
| POST | `/cart/items` 🔒 | Add `{ variantId, qty }` |
| PATCH | `/cart/items/:itemId` 🔒 | Update `{ qty }` or `{ savedForLater }` |
| DELETE | `/cart/items/:itemId` 🔒 | Remove item |
| POST | `/cart/merge` 🔒 | Merge guest cart `[{ variantId, qty }]` |
| POST | `/checkout/quote` 🔒 | `{ items or useCart, deliveryMethod }` → totals |
| GET/POST/PATCH/DELETE | `/users/me/addresses[/:id]` 🔒 | Manage addresses |
| POST | `/orders` 🔒 | Create order + PaymentIntent → `{ orderNumber, clientSecret }` |
| GET | `/orders` 🔒 | Order history (`?range=30d|3m|2026|...`) |
| GET | `/orders/:orderNumber` 🔒 | Order detail |
| POST | `/orders/:orderNumber/cancel` 🔒 | Cancel (only if `pending_payment` or `paid`) |
| POST | `/webhooks/stripe` | Stripe webhook (raw body, signature verified) |
| POST | `/uploads` 🛡 | Image upload to Cloudinary |

Error response shape: `{ message, details? }` with the matching HTTP status code.

---

## 7. File Structure

```
AmazonClone/
├── planning-docs/
│   └── 01-initial-plan.md
├── package.json                  # root scripts: dev (runs client + server), seed
├── .gitignore
├── README.md
│
├── client/                       # React + Vite
│   ├── index.html
│   ├── vite.config.js            # Tailwind plugin, /api proxy → :5000
│   ├── package.json
│   ├── .env.example
│   ├── public/
│   └── src/
│       ├── main.jsx              # Provider, Router, Stripe Elements
│       ├── App.jsx               # Route definitions
│       ├── index.css             # @import "tailwindcss"; theme tokens
│       ├── app/
│       │   └── store.js
│       ├── features/
│       │   ├── api/apiSlice.js           # RTK Query base (credentials: 'include')
│       │   ├── auth/
│       │   │   ├── authSlice.js
│       │   │   └── authApi.js
│       │   ├── products/productsApi.js
│       │   ├── cart/
│       │   │   ├── cartApi.js
│       │   │   └── guestCartSlice.js
│       │   ├── checkout/
│       │   │   ├── checkoutSlice.js
│       │   │   └── checkoutApi.js
│       │   ├── orders/ordersApi.js
│       │   └── account/addressesApi.js
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── SearchPage.jsx
│       │   ├── ProductPage.jsx
│       │   ├── CartPage.jsx
│       │   ├── SignInPage.jsx
│       │   ├── SignUpPage.jsx
│       │   ├── CheckoutPage.jsx
│       │   ├── OrderConfirmationPage.jsx
│       │   ├── AccountPage.jsx
│       │   ├── OrdersPage.jsx
│       │   ├── OrderDetailPage.jsx
│       │   └── NotFoundPage.jsx
│       ├── components/
│       │   ├── layout/           # Header, SearchBar, SubNav, Footer, Layout
│       │   ├── home/             # HeroCarousel, CategoryTiles, ProductRow
│       │   ├── product/          # ProductCard, Gallery, VariantSelector, BuyBox, Reviews
│       │   ├── search/           # FilterSidebar, SortSelect, Pagination
│       │   ├── cart/             # CartItem, SavedItem, SubtotalBox
│       │   ├── checkout/         # AddressStep, DeliveryStep, PaymentStep, OrderSummary
│       │   ├── orders/           # OrderCard, StatusBadge
│       │   └── ui/               # Button, Rating, Price, Spinner, Skeleton, Modal
│       ├── routes/
│       │   └── ProtectedRoute.jsx
│       ├── hooks/                # useAuth, useCart (merges guest/server cart), useQueryParams
│       └── utils/                # formatPrice, cloudinaryUrl, deliveryDate
│
└── server/                       # Node + Express
    ├── package.json
    ├── .env.example
    └── src/
        ├── server.js             # connect DB, start listening
        ├── app.js                # middleware, routes, error handler
        ├── config/
        │   ├── env.js            # validated env vars
        │   ├── db.js
        │   ├── cloudinary.js
        │   └── stripe.js
        ├── models/
        │   ├── User.js
        │   ├── Category.js
        │   ├── Product.js
        │   ├── Review.js
        │   ├── Cart.js
        │   └── Order.js
        ├── routes/               # one router per resource, mounted under /api
        │   ├── auth.routes.js
        │   ├── category.routes.js
        │   ├── product.routes.js
        │   ├── cart.routes.js
        │   ├── checkout.routes.js
        │   ├── user.routes.js
        │   ├── order.routes.js
        │   ├── upload.routes.js
        │   └── webhook.routes.js
        ├── controllers/          # request/response handling per resource
        ├── services/
        │   ├── pricing.service.js     # subtotal, shipping, tax, total
        │   ├── order.service.js       # create (transaction), cancel, release stock
        │   ├── cart.service.js        # merge, hydrate with current price/stock
        │   └── search.service.js      # build Mongo query + sort from params
        ├── middleware/
        │   ├── protect.js        # JWT cookie → req.user
        │   ├── requireAdmin.js
        │   ├── validate.js       # Zod schema → 400
        │   ├── rateLimit.js
        │   └── errorHandler.js
        ├── validators/           # Zod schemas per route
        ├── utils/                # asyncHandler, ApiError, generateOrderNumber, token
        ├── jobs/
        │   └── expirePendingOrders.js  # release stock after 30 min unpaid
        └── seed/
            ├── seed.js           # npm run seed / seed:destroy
            ├── advanceOrders.js  # npm run orders:advance
            ├── transform.js      # source data → Product/Variant/Review shape
            └── data/             # cached source JSON
```

---

## 8. Seed Data

- **Source:** product data from the [DummyJSON](https://dummyjson.com/products?limit=0) API, which has about 190 products with titles, brands, descriptions, images, ratings, and reviews. The JSON is cached in `server/src/seed/data/` so seeding works without a network connection, apart from the Cloudinary upload.
- **Categories:** at least 6 top-level categories, such as Electronics, Fashion, Home & Kitchen, Beauty, Sports & Outdoors, and Groceries. Source categories are mapped onto these.
- **Variants:** products get variants by category:
  - Fashion: sizes S, M, L, XL and 2–3 colors
  - Electronics: storage or color options
  - Others: a single "Standard" variant
  
  Variant prices are the base price plus a small offset. Stock is random between 0 and 50, and about 10% of variants are set to 0 so out-of-stock states can be tested.
- **Ratings and reviews:** reviews come from the source data, with extra reviews generated using `@faker-js/faker` so each product has 3–15. `ratingAvg` and `ratingCount` are calculated from the reviews.
- **Users:** a demo user (`demo@example.com` / `Password123!`) with an address and a few past orders in different statuses, plus an admin user.
- **Commands:**
  - `npm run seed` clears the collections, inserts all data, and uploads any images missing from Cloudinary.
  - `npm run seed:destroy` clears the collections.

---

## 9. Environment Variables

**server/.env**
```
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/amazon-clone
JWT_SECRET=<long random string>
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

**client/.env**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_CLOUDINARY_CLOUD_NAME=...
```

Commit only the `.env.example` files. The `.env` files are listed in `.gitignore`.

---

## 10. Setup Instructions

### Prerequisites

- Node.js 20+ and npm
- A MongoDB Atlas account (free M0 cluster)
- A Stripe account (test mode) and the [Stripe CLI](https://docs.stripe.com/stripe-cli)
- A Cloudinary account (free tier)

### 10.1 Scaffold

```bash
# root
npm init -y
npm install -D concurrently

# client
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom @reduxjs/toolkit react-redux @stripe/stripe-js @stripe/react-stripe-js
npm install -D tailwindcss @tailwindcss/vite
cd ..

# server
mkdir server && cd server
npm init -y
npm install express mongoose dotenv cookie-parser cors helmet morgan jsonwebtoken bcryptjs zod stripe cloudinary multer express-rate-limit slugify
npm install -D nodemon @faker-js/faker
cd ..
```

Set `"type": "module"` in `server/package.json`.

### 10.2 Configure Tailwind and the API proxy

`client/vite.config.js`
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:5000' },
  },
})
```

`client/src/index.css`
```css
@import "tailwindcss";

@theme {
  --color-nav: #131921;
  --color-nav-light: #232f3e;
  --color-accent: #febd69;
  --color-btn-yellow: #ffd814;
  --color-btn-orange: #ffa41c;
  --color-link: #007185;
  --color-price: #b12704;
}
```

### 10.3 Scripts

`server/package.json`
```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "seed": "node src/seed/seed.js",
  "seed:destroy": "node src/seed/seed.js --destroy",
  "orders:advance": "node src/seed/advanceOrders.js"
}
```

Root `package.json`
```json
"scripts": {
  "dev": "concurrently -n server,client -c blue,green \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
  "seed": "npm run seed --prefix server",
  "stripe:listen": "stripe listen --forward-to localhost:5000/api/webhooks/stripe"
}
```

### 10.4 Run locally

```bash
# 1. Fill in server/.env and client/.env from the .env.example files
# 2. Seed the database
npm run seed
# 3. Forward Stripe webhooks (copy the printed whsec_... into STRIPE_WEBHOOK_SECRET)
npm run stripe:listen
# 4. In another terminal, start client + server
npm run dev
```

The client runs at http://localhost:5173 and the API at http://localhost:5000/api.

To test checkout, sign in as `demo@example.com` / `Password123!` and pay with card `4242 4242 4242 4242`, any future expiry date, and any CVC.

---

## 11. Build Milestones

Each milestone ends with something that can be demoed.

| # | Milestone | Done when |
|---|---|---|
| 1 | **Foundation**: scaffold, env config, DB connection, models, error handling, layout shell (Header, SubNav, Footer) | `npm run dev` serves the layout and `GET /api/health` returns OK |
| 2 | **Seed data**: transform script, Cloudinary upload, demo users | `npm run seed` loads 100+ products across 6 categories, each with variants, images, and reviews |
| 3 | **Browse**: homepage rows, search/category listing with filters, sort, and pagination | Searching "phone", filtering to 4★+ under $500, and sorting by price all work and are reflected in the URL |
| 4 | **Product Details**: gallery, variant selector, buy box, reviews | Switching variants updates the price, stock, image, and URL |
| 5 | **Auth**: sign up, sign in, sign out, `/me`, protected routes | Refreshing the page keeps the user signed in, and signing out clears the session |
| 6 | **Cart**: guest cart, server cart, merge on sign in, save for later | A guest's cart survives a refresh and merges into the account cart after sign in |
| 7 | **Checkout + Stripe**: addresses, delivery methods, quote, order creation, PaymentIntent, webhook, Buy Now | A test-card payment produces a `paid` order and lands on the confirmation page |
| 8 | **Orders / Account**: order list and detail, cancel, buy it again, address management | Past orders show the correct statuses, and cancelling releases stock |
| 9 | **Polish**: responsive layout, loading/empty/error states, 404 page, accessibility pass, README | The core flow works at 375px width and on desktop |

Milestones 1–7 deliver the core flow. Milestones 8–9 complete the MVP.
