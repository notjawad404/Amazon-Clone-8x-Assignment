# Amazon Clone: Initial Plan

This document defines the MVP for an Amazon-style store built on the MERN stack. It covers the tech stack, file structure, data model, API, the main technical decisions, and local setup.

The other planning docs:

| Doc | Covers |
|---|---|
| [02-project-structure.md](02-project-structure.md) | Frontend and backend folder structure, routes, endpoints |
| [03-database-schema.md](03-database-schema.md) | Collections, relationships, indexes, DummyJSON import, checkout and payments |
| [04-development-phases.md](04-development-phases.md) | Build order, phase by phase |
| [05-coding-standards.md](05-coding-standards.md) | Coding and web development practices to follow |

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
| 9 | Admin: Catalog | `/admin/products`, `/admin/products/:id`, `/admin/categories` | Admin only. Create, edit, publish, and archive products. Edit variants (price, stock, SKU). Upload and reorder images. Manage the category tree |

Also needed: a 404 page, empty states (empty cart, no results, no orders), and loading skeletons.

### 3.2 Business rules

- **Guests can browse and build a cart.** Sign-in is only required at checkout. When a guest signs in, their cart is merged into their account cart. Quantities are added together and capped at available stock.
- **The server computes all prices.** The client sends variant IDs and quantities only. Subtotal, shipping, tax, and total are always calculated on the server.
- **Money is stored as integer cents.**
- **Shipping:** Standard is free for subtotals of $35 or more and $5.99 otherwise. It takes 5 business days. Expedited is $9.99 and takes 2 days. Next Day is $14.99.
- **Tax:** a flat 8% of the subtotal.
- **Orders store a snapshot of each item** (title, variant label, image, unit price) and of the shipping address. Later edits to a product do not change past orders.
- **Stock is reserved when the order is created.** It is released if the order isn't paid within 30 minutes or is cancelled. A declined card does not cancel the order: the user can retry with another card while the reservation lasts.
- **The catalog lives in MongoDB.** Products and categories are imported once from DummyJSON as starter data, and are then managed in the admin pages. The app never calls DummyJSON at runtime.
- **Buy Now** checks out a single item directly and does not change the cart.
- **Order status:** `pending_payment` → `paid` → `shipped` → `delivered`. An order can also become `cancelled` from `pending_payment` or `paid`. In the MVP, shipping and delivery status are moved forward by a dev script (`npm run orders:advance`).

### 3.3 Out of scope for MVP

Seller/marketplace features, admin features beyond catalog management (order management, users, reports), recommendation engine, writing reviews, wishlists, returns/refunds UI, email notifications, OAuth login, password reset, multiple currencies or languages, Prime.

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
- **`checkoutSlice`** holds only the current `checkoutId` and the Buy Now item. The selected address, delivery method, and price quote are stored on the server in the `checkouts` collection.

### 4.3 Checkout and payments (Stripe)

The full design is in [03-database-schema.md §5.6–5.9 and §7.5](03-database-schema.md#75-checkout-and-stripe-payment). In summary:

1. Opening `/checkout` creates a **checkout** document on the server with the items, address, delivery method, and a quote calculated on the server.
2. **Place order** recalculates the quote. If the price changed, the user must confirm again. Otherwise the server reserves stock and creates the order in one transaction, then creates a Stripe **PaymentIntent** (with an idempotency key) and a **payment** document, and returns the `clientSecret`.
3. The client confirms the card with Stripe Elements. A declined card can be retried with the same PaymentIntent.
4. Stripe webhooks are verified, recorded in **stripeEvents** so each event is processed only once, and then update the payment and the order (paid, refunded, cancelled).
5. The confirmation page polls the order until it is `paid`.

The webhook route uses `express.raw()` and is registered **before** `express.json()` so Stripe signature verification works. Card details and the `client_secret` are never stored. Use test card `4242 4242 4242 4242` in development.

### 4.4 Images (Cloudinary)

- The seed script uploads each product image to Cloudinary under `amazon-clone/products/<slug>/`. It uses a deterministic `public_id`, so running the script again does not create duplicates.
- Products store the Cloudinary `url` and `publicId` for each image.
- The frontend requests resized images with Cloudinary transformations (for example, `w_400,f_auto,q_auto` for cards).
- `POST /api/admin/uploads` (multer memory storage → Cloudinary upload stream) is admin-only and used by the admin product pages. Removing an image from a product also deletes it from Cloudinary.

### 4.5 Stock reservation and transactions

Order creation runs in a MongoDB transaction. For each item, stock is decremented with a conditional update (`{ _id, stock: { $gte: qty } }`). If any item fails, the whole order is aborted. Transactions need a replica set, so use **MongoDB Atlas**, which includes one, or run a local single-node replica set.

---

## 5. Data Model

The full schema is in [03-database-schema.md](03-database-schema.md). MongoDB holds 9 collections:

| Collection | Holds |
|---|---|
| `users` | Accounts, roles (`user` / `admin`), embedded addresses |
| `categories` | Two-level tree (department → category), managed by admins |
| `products` | Catalog with embedded variants (SKU, price, stock), `draft` / `active` / `archived` status, managed by admins |
| `reviews` | Product reviews |
| `carts` | One cart per signed-in user |
| `checkouts` | Server-side checkout state and price quote |
| `orders` | Orders with item and address snapshots |
| `payments` | One Stripe PaymentIntent per order, with card summary, errors, and refunds |
| `stripeEvents` | Webhook events received, so each is processed only once |

---

## 6. API Endpoints

The complete endpoint list, grouped by router, is in [02-project-structure.md §3.4](02-project-structure.md#34-endpoints-by-router). All endpoints are under `/api`. Admin endpoints are under `/api/admin` and require the `admin` role. Errors use the shape `{ message, details? }`.

---

## 7. File Structure

The full frontend and backend structure is in [02-project-structure.md](02-project-structure.md). At the top level:

```
AmazonClone/
├── client/          # React + Vite
├── server/          # Node + Express API
├── e2e/             # Playwright tests
├── planning-docs/
└── package.json     # Root scripts: dev, seed, stripe:listen
```

---

## 8. Seed Data

The full DummyJSON analysis, the category mapping, and the variant rules are in [03-database-schema.md §2–3](03-database-schema.md#3-source-data-dummyjson-initial-import-only). In summary:

- **Source:** product data from the [DummyJSON](https://dummyjson.com/products?limit=0) API (194 products, checked 2026-10-04). 184 are used, because vehicles and motorcycles are excluded. The JSON is cached in `server/src/seed/data/` so seeding works without a network connection, apart from the Cloudinary upload.
- **Categories:** 6 departments (Electronics, Fashion, Home & Kitchen, Grocery, Sports & Outdoors, Beauty & Personal Care) containing 22 categories mapped from the source.
- **Variants:** apparel and shoes get sizes, phones and tablets get storage options, laptops get configurations, and everything else gets a single "Standard" variant. Variants never differ by color, because each product only has images for one color. The source stock is split across variants, and about 10% of variants are set to 0 so out-of-stock states can be tested.
- **Ratings and reviews:** reviews come from the source data, with extra reviews generated using `@faker-js/faker` so each product has 3–15. `ratingAvg` and `ratingCount` are calculated from the reviews.
- **Users:** a demo user (`demo@example.com` / `Password123!`) with an address and a few past orders in different statuses, plus an admin user.
- **Commands:**
  - `npm run seed:fetch` saves the DummyJSON snapshot to `server/src/seed/data/` (already verified, run once).
  - `npm run seed` imports the snapshot into an **empty** database. It refuses to run if the catalog already has data, so your own edits are never overwritten.
  - `npm run seed -- --reset` wipes and re-imports (development only).

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
  "seed:reset": "node src/seed/seed.js --reset",
  "seed:fetch": "node src/seed/fetchSource.js",
  "catalog:resync": "node src/seed/resyncCatalog.js",
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

## 11. Build Phases

The build order is defined in [04-development-phases.md](04-development-phases.md), which replaces the milestone list that used to be here. The detailed folder layout is in [02-project-structure.md](02-project-structure.md), and the full schema is in [03-database-schema.md](03-database-schema.md). Where this document and those disagree, those documents are correct.
