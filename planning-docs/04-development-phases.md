# Development Phases

This document splits the whole project into phases, in build order. Each phase lists its backend and frontend work, what it delivers, and the checks that must pass before the next phase starts.

Related docs: [01-initial-plan.md](01-initial-plan.md), [02-project-structure.md](02-project-structure.md), [03-database-schema.md](03-database-schema.md).

---

## Overview

| Phase | Name | Main output |
|---|---|---|
| 0 | Project setup | Client + server scaffolded, both run with `npm run dev`, layout shell |
| 1 | Database schema & seed data | All Mongoose models, indexes, 184 products in MongoDB, images on Cloudinary |
| 2 | Authentication | Sign up, sign in, sign out, session restore, protected routes |
| 3 | Homepage | Hero, category cards, product rows from real data |
| 4 | Navigation | Full header, sub-nav, account menu, cart badge, footer |
| 5 | Top search & category sidebar | Search bar with department select, "All" slide-out category menu |
| 6 | Category & product listing pages | `/s` and `/c/:slug` with filter sidebar, sort, pagination |
| 7 | Product detail page | Gallery, variants, buy box, reviews, related products |
| 8 | Cart | Guest + server cart, merge on sign in, save for later |
| 9 | Checkout & payment | Addresses, delivery, Stripe payment, order creation, Buy Now |
| 10 | Order confirmation | Confirmation page with payment status polling |
| 11 | Account & orders | Account hub, addresses, order history and detail, cancel, buy again |
| 12 | Polish & testing | Responsive layout, all states, accessibility, end-to-end test |
| 13 | Deployment | Production build on a single origin, live Stripe webhook |

```
0 ─► 1 ─► 2 ─► 3 ─► 4 ─► 5 ─► 6 ─► 7 ─► 8 ─► 9 ─► 10 ─► 11 ─► 12 ─► 13
          │                         ▲         ▲
          └── auth is needed by ────┴─────────┘ (account menu in 4, cart merge in 8, checkout in 9)
```

Phases 0–10 cover the core flow (Home → Search/Category → Product → Cart → Checkout → Confirmation). Phase 11 completes the MVP with Orders. Phases 12–13 make it production ready.

### Done in every phase

A phase is only complete when all of these hold:

- Every item in its "Done when" list passes when checked by hand in the browser.
- Server tests for any new service logic pass (`npm test --prefix server`).
- No console errors in the browser and no unhandled errors in the server log.
- Loading, empty, and error states exist for every new screen.
- Committed with a clear message.

---

## Phase 0: Project Setup

**Goal:** both apps run together locally, with tooling and a layout shell in place.

**Root**
- `npm init`, add `concurrently`, and add the `dev`, `seed`, and `stripe:listen` scripts.
- `.gitignore` entries for `node_modules`, `.env`, `dist`, and `coverage`.
- README with setup steps (copied from 01-initial-plan §10).

**Backend**
- `server/` with `"type": "module"` and the dependencies from 01-initial-plan §10.1.
- `config/env.js` (Zod validation of env vars), `config/db.js`, `app.js`, `server.js`.
- `utils/ApiError.js`, `utils/asyncHandler.js`, `middleware/notFound.js`, `middleware/errorHandler.js`.
- Base middleware (helmet, json, cookieParser, cors, morgan) in the order given in 02-project-structure §3.3.
- `GET /api/health` → `{ status: "ok", db: "connected" }`.
- Vitest + supertest + `MongoMemoryReplSet` test setup, with one passing health test.

**Frontend**
- `npm create vite@latest client -- --template react`, then install Router, Redux Toolkit, Tailwind, and Stripe.
- Tailwind v4 via `@tailwindcss/vite` and `@theme` tokens in `index.css`.
- Vite proxy `/api` → `http://localhost:5000`.
- `store.js` with an empty `apiSlice`, `router.jsx` with a placeholder route for every page, and `Layout.jsx` with a basic header bar and footer.
- `components/ui/` starter set: `Button`, `Input`, `Spinner`, `Skeleton`.
- ESLint + Prettier.

**External accounts:** create a MongoDB Atlas cluster, a Cloudinary account, and a Stripe account (test mode). Fill in both `.env` files.

**Done when**
- `npm run dev` starts both apps, and http://localhost:5173 shows the layout shell.
- Requesting `/api/health` through the Vite proxy returns `db: "connected"`.
- `npm test --prefix server` passes.

---

## Phase 1: Database Schema & Seed Data

**Goal:** every collection is modeled, indexed, and filled with realistic data.

**Backend**
- Models exactly as in 03-database-schema §4:
  - `User` (+ addresses)
  - `Category`
  - `Product` (+ variants, denormalization hook, `syncStockFields`)
  - `Review`
  - `Cart`
  - `Order` (+ status transition helper)
- All indexes from 03-database-schema §5.
- Seed pipeline in `src/seed/`:
  1. `fetchSource.js`: calls `/products?limit=0` and `/products/categories` and writes both responses to `seed/data/`.
  2. `categoryMap.js`: creates 6 departments and 22 categories, and drops `vehicle` and `motorcycle`.
  3. `transformProduct.js`:
     - cents conversion and list price
     - brand defaults to "Generic"
     - bullets
     - specs
     - unique slugs
  4. `generateVariants.js`: rules from 03-database-schema §2.5.
  5. `generateReviews.js`: keeps the 3 source reviews, adds generated ones, and calculates `ratingAvg`, `ratingCount`, and `ratingBreakdown`.
  6. `uploadImages.js`: uploads with an encoded URL to `amazon-clone/products/<slug>/<n>` using `overwrite: false`. Already-uploaded images are skipped, at most 5 uploads run at a time, and the script prints progress.
  7. `seedUsersAndOrders.js`: demo user + admin, demo address, 4 historical orders.
  8. `seed.js`: runs the steps above, calls `syncIndexes()`, and prints a summary. `--destroy` clears everything.
- Unit tests:
  - `transformProduct` (cents rounding, list price rule, slug collision)
  - `generateVariants` (counts per category)
  - `Product` pre-save hook (min/max price, inStock)

**Frontend:** none.

**Done when**
- `npm run seed` finishes and prints:
  - 28 categories
  - 184 products
  - about 310 variants
  - about 1,600 reviews
  - 2 users
  - 4 orders
  - 424 images
- Running `npm run seed` again creates no duplicate Cloudinary images and gives the same counts.
- In Atlas or Compass, a product document matches the schema, and every index is listed.
- A product's Cloudinary URL opens in the browser.

---

## Phase 2: Authentication

**Goal:** users can create an account, sign in, stay signed in across refreshes, and sign out.

**Backend**
- `auth.service.js`: bcrypt hash and compare, and JWT signing.
- `utils/token.js`: sets the httpOnly cookie (`sameSite=lax`, `secure` in production, 7 days).
- Routes:
  - `POST /auth/signup`
  - `POST /auth/signin`
  - `POST /auth/signout`
  - `GET /auth/me`
- `middleware/protect.js`, `optionalAuth.js`, `requireAdmin.js`.
- Zod schemas:
  - email
  - password: 8 or more characters, with at least one letter and one number
  - name: 2–50 characters
- `authLimiter`: 10 attempts per 15 minutes per IP on signin and signup.
- Error messages don't reveal whether an email exists: sign-in failures return "Your email or password is incorrect."
- Tests:
  - signup → me
  - duplicate email → 409
  - wrong password → 401
  - signout clears the cookie
  - `/me` without a cookie → 401

**Frontend**
- `authApi.js`, `authSlice.js`, `useAuth()`.
- `App.jsx` calls `useGetMeQuery()` on load and shows a blank layout with a spinner until it resolves (so the UI doesn't briefly appear signed out).
- `SignInPage` and `SignUpPage` in the Amazon style: centered card, logo above, "New to …? Create your account" divider.
- Show password, inline field errors, and the server error in an alert box.
- `ProtectedRoute` (redirects to `/signin?redirect=…`) and `GuestOnlyRoute`.
- After sign in, go to `redirect` if it is a safe internal path, otherwise to `/`.

**Done when**
- Signing up as a new user signs them in and lands them on `/`.
- Refreshing the page keeps the user signed in.
- Signing out and then opening `/account` redirects to `/signin?redirect=/account`. Signing in from there returns to `/account`.
- The browser devtools show the cookie as `HttpOnly`, and no token is in localStorage.
- `demo@example.com / Password123!` works.

---

## Phase 3: Homepage

**Goal:** a homepage built from real catalog data that looks like Amazon's.

**Backend**
- `GET /api/categories`: the full tree, sorted.
- `GET /api/products/home` returns `{ bestSellers, newArrivals, deals, topRated: [{ department, products }] }`. Each product has only the card fields (03-database-schema §6.1).
- Cache headers: `Cache-Control: public, max-age=300` on both.

**Frontend**
- `catalogApi.js`: `getCategories`, `getHome`.
- `HeroCarousel`:
  - 3–4 static promo banners (our own images, stored in Cloudinary or `public/`)
  - auto-advances every 6 s, pauses on hover
  - prev/next arrows and keyboard support
  - fades into the page background at the bottom, like Amazon's
- `CategoryCardGrid`: 4 cards that overlap the hero. Each card shows a 2×2 grid of categories in one department and links to `/c/:slug`.
- `ProductRow` × 4 (Best Sellers, Today's Deals, New Arrivals, Top Rated in {dept}), scrolling horizontally with arrow buttons.
- `ProductCardCompact`, `Price`, `StarRating` UI components.
- `utils/cloudinary.js` and `utils/money.js`.
- Skeletons while loading. If the home request fails, show an error state with a retry button.

**Done when**
- The homepage shows the hero, 4 category cards, and 4 product rows, all from the database.
- Every card and tile links to the correct (placeholder) product or category route.
- Images are served from Cloudinary with `w_` / `f_auto` transforms (check the Network tab).
- Rows scroll horizontally with the mouse, touch, and the arrow buttons.

---

## Phase 4: Navigation

**Goal:** the complete global navigation: header, sub-nav, and footer.

**Backend:** none new (uses `/auth/me` and `/categories`).

**Frontend**
- `Header` (dark `nav` color), left to right:
  - `NavLogo` → `/`
  - `DeliverTo`: "Deliver to {first name} {city}" from the default address, or "Deliver to" + "Update location" for guests. Display only.
  - Search area: placeholder slot, built in Phase 5
  - `AccountMenu`: "Hello, sign in" / "Hello, {name}" + "Account & Lists ▾". The hover/focus dropdown holds a Sign in button + "New customer? Start here" for guests, and Your Account / Your Orders / Sign out for signed-in users.
  - `OrdersLink`: "Returns & Orders" → `/orders`
  - `CartIcon`: count badge from `useCart().count`. Until Phase 8 this comes from the guest cart slice.
- `SubNav` (`nav-light`): "☰ All" button (opens the sidebar in Phase 5) + department links → `/c/:slug`.
- `Footer`: "Back to top", 4 link columns, logo row.
- `CheckoutHeader`: logo + "Checkout" + lock icon, used on `/checkout`.
- `Layout` picks full, minimal, or checkout chrome based on the route (02-project-structure §2.3).
- Mobile (< 768px): the header becomes two rows (logo/account/cart, then the full-width search), and the sub-nav scrolls horizontally.
- Keyboard: the dropdown opens on focus, Esc closes it, and there is a "Skip to main content" link.

**Done when**
- The header, sub-nav, and footer appear on every full-layout page. Sign-in/up shows the minimal layout and checkout shows the checkout header.
- The account menu shows the correct content for guests and signed-in users, and Sign out works from it.
- The navigation works at 375px, 768px, and 1440px widths and with the keyboard alone.

---

## Phase 5: Top Search & Category Sidebar

**Goal:** working global search and the "All" slide-out category menu.

**Backend**
- `GET /api/products` with basic search:
  - `q` → `$text`
  - `category` → department or category id
  - `page` and `limit`
  - default sort: relevance
- `search.service.js` takes the params and returns the query to run. Filters and the remaining sorts are added in Phase 6, still in this one service.
- Validated by `product.schema.js` (Zod): `q` max 100 chars, `page` ≥ 1, `limit` ≤ 48.
- Tests: text search finds "iPhone", category filtering by department vs category, invalid params → 400.

**Frontend**
- `SearchBar`:
  - department `<select>` ("All", then the 6 departments), sized to fit the selected option like Amazon's
  - text input, and an orange submit button with a magnifier icon
  - submitting goes to `/s?k=<query>&category=<slug>`
  - the input and select are filled from the URL when you land on `/s`
  - the input gets an orange focus ring
- `CategorySidebar` (in a `Drawer`):
  - opened from "☰ All"
  - header: "Hello, {name}" or "Hello, sign in"
  - "Shop by Department" lists the 6 departments. Clicking one slides in a panel with its categories + "See all {department}" and a back arrow. Links go to `/c/:slug`.
  - "Help & Settings" section: Your Account, Sign in/out
  - closes on overlay click, Esc, or route change; keeps focus inside while open; locks body scroll
- `SearchPage` (basic version): reads `k` and `category`, calls `searchProducts`, and shows a results count and a grid of `ProductCard`s.

**Done when**
- Searching "laptop" with the department set to All shows the laptops. Searching "watch" with Fashion selected shows only watches.
- Search with an empty query does nothing. A search with no matches shows an empty state with suggestions.
- The sidebar opens, drills down into a department's categories, goes back, navigates, and closes. It works with the keyboard alone.
- Reloading `/s?k=phone` keeps the input filled and the results the same.

---

## Phase 6: Category & Product Listing Pages

**Goal:** complete listing pages with filters, sorting, and pagination for both search results and categories.

**Backend**
- Complete `GET /api/products` (03-database-schema §6.2):
  - Filters: `minPrice`, `maxPrice`, `rating`, `brand`, `inStock`
  - Sorts: `price_asc`, `price_desc`, `rating`, `newest`
  - Response: `{ items, total, page, pages, facets: { brands: [{ name, count }] } }`
- The brand facet ignores the current brand filter, so the user can still select other brands.
- Tests:
  - every filter on its own and combined
  - sort order
  - pagination edges
  - brand facet counts

**Frontend**
- `/c/:slug` renders `SearchPage` with the category set from the URL. The page title is the category name, with breadcrumbs for categories (Department › Category).
- A department page (`/c/electronics`) shows a row of its categories as image tiles above the results.
- `FilterSidebar`:
  - Department/category tree: the current category in bold, plus sibling and child links
  - `PriceFilter`: preset ranges (Under $25, $25–$50, $50–$100, $100–$200, $200 & above) plus min/max inputs + Go
  - `RatingFilter`: ★★★★ & Up, ★★★ & Up, and so on
  - `BrandFilter`: checkboxes with counts, "See more" after 8
  - "Include out of stock" toggle (default: in stock only)
  - "Clear" links for each section
- `ResultsHeader` ("1-24 of 38 results for "phone""), `SortSelect` ("Sort by: Featured" etc.), `ActiveFilters` chips.
- `ProductCard`:
  - image, title (2-line clamp), stars + count, price with cents in superscript
  - list price and % off
  - "FREE delivery {date}" when the price is $35 or more
  - "Only N left in stock" when relevant
- `Pagination`: Previous, numbered pages with ellipsis, Next. Scrolls to the top when the page changes.
- `useSearchParamsState`: every filter, sort, and page lives in the URL. Changing a filter resets to page 1.
- Mobile: the filter sidebar becomes a "Filters" button that opens a drawer.

**Done when**
- `/s?k=phone&rating=4&maxPrice=500&sort=price_asc` shows the matching results, and every filter control reflects the URL.
- Browser back/forward steps through filter changes correctly.
- `/c/fashion` lists all 49 fashion products. `/c/womens-shoes` lists 5, with breadcrumbs.
- An unknown slug (`/c/nope`) shows the 404 page.

---

## Phase 7: Product Detail Page

**Goal:** a complete product page with working variant selection and the buy box.

**Backend**
- `GET /products/:slug`: full product or 404.
- `GET /products/:slug/reviews?page=&sort=recent|top`: paginated, 10 per page.
- `GET /products/:slug/related`: 8 products from the same category.
- Tests: missing slug → 404, inactive product → 404, review pagination.

**Frontend**
- Three-column layout (desktop): gallery | details | buy box. On mobile they stack.
- `ImageGallery`: vertical thumbnails. Hovering a thumbnail changes the main image. Clicking opens a full-screen modal with arrows.
- Details column:
  - title, "Visit the {brand} Store" link (→ `/s?brand=`)
  - stars + "N ratings" (scrolls to reviews)
  - `Price` with list price and −% badge
  - `VariantSelector` ("Size: M" buttons). Unavailable variants are shown greyed out with a strikethrough.
  - `AboutThisItem` bullets
- `BuyBox`:
  - price
  - "FREE delivery {date}" or "$5.99 delivery"
  - stock message (In Stock / Only N left / Currently unavailable)
  - `QtySelect` (1 to min(stock, 30))
  - **Add to Cart** (yellow), **Buy Now** (orange)
  - "Ships from / Sold by" lines
  - Buttons are disabled when the variant is out of stock.
- Selecting a variant updates `?v=` with `replace`, so it doesn't fill the browser history.
- Below the fold:
  - `ProductInfoTable` (brand, dimensions, weight, warranty, return policy)
  - description
  - "Products related to this item" `ProductRow`
  - `RatingHistogram` + `ReviewList` with pagination
- Until Phase 8: Add to Cart writes to the guest cart slice. Buy Now is stubbed (it saves `buyNowItem` and goes to `/checkout`).
- Breadcrumbs: Department › Category.

**Done when**
- Opening a phone, selecting 256 GB, changes the price and the URL. Reloading keeps 256 GB selected.
- A product with an out-of-stock variant shows that variant disabled, and choosing a sold-out product shows "Currently unavailable" with the buttons disabled.
- The quantity limit follows stock: a variant with 3 left offers 1–3.
- Reviews paginate, and the histogram adds up to `ratingCount`.

---

## Phase 8: Cart

**Goal:** a cart that works for guests and signed-in users, merges on sign in, and supports save for later.

**Backend**
- `cart.service.js`:
  - `getHydrated`: fills in the current price, stock, title, and image for each item, and adds flags: `priceChanged`, `outOfStock`, `unavailable`
  - `addItem`: adds a new item or increases qty, capped at stock and 30
  - `updateItem`: qty, `savedForLater`
  - `removeItem`
  - `merge`
  - `preview`: hydrates guest items without saving
- Routes from 02-project-structure §3.4. Unknown or removed variants → 409 with `details`.
- Tests:
  - add twice increases qty
  - qty is capped at stock
  - merge sums quantities
  - save for later is left out of the subtotal
  - preview doesn't write

**Frontend**
- `cartApi.js` and `useCart()`, a single interface over the guest cart and the server cart.
- Listener middleware: when the user signs in, merge the guest cart, then clear it.
- `CartPage`:
  - "Shopping Cart" + "Price" column header
  - `CartItem`: image, title link, variant label, stock line, `QtySelect` (choosing "0 (Delete)" removes the item), Delete | Save for later
  - "Subtotal (N items): $X" under the list, and again in the right-hand `SubtotalBox`
  - "Proceed to checkout" (yellow) → `/checkout`. A guest is sent to `/signin?redirect=/checkout` first.
  - "Saved for later (N items)" section: Move to cart, Delete
  - Price-changed notice and out-of-stock notice for each line
  - Empty cart state: "Your Cart is empty" + "Shop today's deals" + sign-in prompt for guests
- After Add to Cart: a toast or side panel showing "Added to Cart" with the subtotal and a Go to Cart button.
- `CartIcon` count = sum of the quantities of items not saved for later.

**Done when**
- A guest adds 2 items, refreshes, and both are still there.
- The guest signs in, and the cart now holds the guest items plus any items already in the account cart. Matching items have their quantities added together.
- Changing the qty, deleting, and save for later / move to cart all update the subtotal and the header count straight away.
- Signing out empties the cart icon. Signing back in restores the server cart.

---

## Phase 9: Checkout & Payment

**Goal:** a signed-in user can pay with Stripe (test mode) and an order is created safely.

**Backend**
- `address.service.js` + routes: list, create, update, delete, set default (max 10 addresses).
- `pricing.service.js`:
  - subtotal
  - shipping rules (01-initial-plan §3.2)
  - 8% tax
  - total
  - `estimatedDelivery` using business days
  - Unit tests cover the boundaries ($34.99 vs $35.00, rounding).
- `POST /checkout/quote` with `{ source: "cart" }` or `{ source: "buy_now", item }`, plus `deliveryMethod` → returns the totals and all three delivery options with their prices and dates.
- `order.service.create` (03-database-schema §6.5):
  - one transaction: conditional stock decrement, then snapshot insert
  - `checkoutId` makes repeated requests return the same order
  - after commit: create the PaymentIntent (`amount = totalCents`, `metadata.orderNumber`)
  - returns `{ orderNumber, clientSecret }`
- `POST /webhooks/stripe`:
  - `express.raw`, `stripe.webhooks.constructEvent`
  - `succeeded` → `markPaid`
  - `payment_failed` → cancel + release stock
  - always answers `200` once the signature is valid
- `jobs/expirePendingOrders.js`, started from `server.js`.
- Tests:
  - order totals come only from the server
  - insufficient stock → 409 with nothing written
  - repeating a `checkoutId` returns the same order
  - `markPaid` runs only once
  - expiry releases the stock

**Frontend**
- `CheckoutPage` with `CheckoutHeader`: numbered sections, one open at a time (like Amazon's):
  1. **Shipping address**: choose from saved addresses or "Add a new address" (`AddressForm` in a `Modal`). The default address is preselected.
  2. **Delivery**: radio buttons with the price and date for Standard / Expedited / Next Day.
  3. **Payment**: Stripe `CardElement` styled to match. Card errors appear inline.
  4. **Review items**: item list (from the cart or the Buy Now item), with a "Change" link back to the cart.
- `OrderSummary` sticky sidebar:
  - Items, Shipping & handling, Total before tax, Estimated tax, **Order total**
  - "Place your order" (yellow), disabled until an address and a delivery method are chosen and the card form is complete
- Placing the order:
  1. `createOrder`
  2. `stripe.confirmCardPayment(clientSecret)`
  3. navigate to `/order/:orderNumber/confirmation`
  - On payment error: show the message and allow a retry with the same order.
  - On 409: return to the cart with a notice.
- Buy Now from the product page: the checkout uses `buyNowItem` and leaves the cart unchanged.
- `checkoutId` is generated when checkout opens and reset after success.
- Run `npm run stripe:listen` during this phase.

**Done when**
- Test card `4242 4242 4242 4242` gives a `paid` order. The stock goes down, those items leave the cart, and `salesCount` goes up.
- Card `4000 0000 0000 0002` (declined) shows the error. Retrying with 4242 succeeds on the same order.
- Double-clicking "Place your order" creates one order.
- Two browsers buying the last unit at the same moment: one succeeds and the other gets an out-of-stock message.
- Buy Now completes a purchase without changing the cart.
- Changing the price in the browser's request has no effect on the total charged.

---

## Phase 10: Order Confirmation

**Goal:** a clear confirmation page after payment.

**Backend**
- `GET /orders/:orderNumber`: available only to the order's owner, otherwise 404.

**Frontend**
- `OrderConfirmationPage`:
  - While `pending_payment`, poll every 2 s for up to 20 s and show "Confirming your payment…".
  - Once paid:
    - green check + "Order placed, thanks!"
    - "Confirmation will be sent to your email" (copy only)
    - order number
    - shipping address
    - delivery method + "Arriving {date}"
    - item thumbnails
    - totals
    - links: "Review or edit your order" (→ `/orders/:orderNumber`) and "Continue shopping"
  - If still pending after 20 s: "We're still confirming your payment" + a link to Your Orders.
  - If cancelled: payment failed message + "Try again".
- The cart icon count updates (the `Cart` cache is invalidated).

**Done when**
- After a successful payment the page shows the confirmed order within a few seconds.
- Reloading the confirmation page works. Another user opening the same URL gets a 404.

---

## Phase 11: Account & Orders

**Goal:** the user can see and manage their account and order history.

**Backend**
- `GET /orders?range=30d|3m|<year>&page=`: paginated, newest first.
- `POST /orders/:orderNumber/cancel`:
  - only from `pending_payment` or `paid`
  - releases stock in a transaction
  - refunds paid orders through Stripe
- `POST /orders/:orderNumber/buy-again`: adds items that are still available to the cart and reports any that were skipped.
- `npm run orders:advance` moves paid orders to shipped and shipped orders to delivered, with timestamps.
- Tests: cancel rules for each status, refund called for paid orders, buy-again skips unavailable items.

**Frontend**
- `AccountPage`: "Your Account" tile grid (Your Orders, Login & security (shows name and email), Your Addresses).
- `AddressesPage`: address cards + "Add address" tile, Edit / Remove / Set as default.
- `OrdersPage`:
  - "Your Orders" and the time range select
  - `OrderCard`: header strip with Order placed / Total / Ship to (hover shows the address) / Order # and "View order details"
  - body: `StatusBadge` + delivery text, item rows, "Buy it again" button
  - empty state
- `OrderDetailPage`:
  - `OrderTimeline` (from `statusHistory`)
  - shipping address, payment method (brand •••• last4)
  - order summary, items
  - Cancel button with confirmation modal when cancellable

**Done when**
- The demo user sees 4 seeded orders plus any new ones, with the correct statuses and filters.
- Cancelling a paid order changes it to Cancelled, puts the stock back, and shows a refund in the Stripe dashboard.
- Buy it again adds the items to the cart and opens the cart.
- After `npm run orders:advance` the status and timeline update.

---

## Phase 12: Polish & Testing

**Goal:** the MVP works on every screen size and passes accessibility and end-to-end checks.

- **Responsive:** check every page at 375 / 768 / 1024 / 1440 px.
- **States:** go through the loading, empty, and error states of every page. Add a 404 page and an `errorElement` for each route.
- **Accessibility:**
  - labels on every input
  - alt text on product images
  - focus rings
  - modal/drawer focus traps
  - color contrast
  - a Lighthouse accessibility score of at least 90 on Home, Search, and Product
- **Performance:**
  - lazy-loaded routes
  - `loading="lazy"` on images below the fold
  - Cloudinary `f_auto,q_auto`
  - Lighthouse performance of at least 80 on Home
- **Security check:**
  - helmet headers
  - rate limits
  - no `passwordHash` in any response
  - every order/cart/address query filters by `req.user._id`
  - Zod on every input
- **End-to-end** (`e2e/`, Playwright): one test of the core flow:
  1. home
  2. search "phone"
  3. filter
  4. product
  5. select variant
  6. add to cart
  7. sign in
  8. checkout with test card
  9. confirmation
  10. orders

  plus one test for a guest-cart merge.
- README: features, screenshots, setup, test cards, demo login.

**Done when:** the end-to-end tests pass locally, the Lighthouse targets are met, and no page has a layout bug at the sizes listed.

---

## Phase 13: Deployment

**Goal:** a public demo with the same behavior as local.

- **Single origin:** in production Express serves `client/dist` as static files, with a fallback to `index.html` for client-side routes. The cookie stays first-party and needs no CORS. Deploy as one web service (for example Render or Railway) with the build command `npm run build --prefix client && npm install --prefix server`.
- Production env vars on the host. MongoDB Atlas network access must allow the host.
- Stripe: add a webhook endpoint in the dashboard (`https://<host>/api/webhooks/stripe`, events `payment_intent.succeeded` and `payment_intent.payment_failed`) and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Stay in **test mode**.
- Seed the production database once with `npm run seed`.
- Smoke test: run the end-to-end flow by hand on the live URL.

**Done when:** the live URL completes the core flow with a test card, and the order appears in Your Orders.

---

## After the MVP

These items are out of MVP scope. They're listed in rough priority order:

1. Search autocomplete (Atlas Search)
2. Writing reviews (verified purchasers only)
3. Wishlists
4. "Inspired by your browsing history" row
5. Password reset email
6. Order confirmation email
7. Admin product management UI (uses `POST /uploads`)
8. Returns
