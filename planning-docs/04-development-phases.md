# Development Phases

This document splits the whole project into phases, in build order. Each phase lists its backend and frontend work, what it delivers, and the checks that must pass before the next phase starts.

Related docs: [01-initial-plan.md](01-initial-plan.md), [02-project-structure.md](02-project-structure.md), [03-database-schema.md](03-database-schema.md), [05-coding-standards.md](05-coding-standards.md).

---

## Overview

| Phase | Name | Main output |
|---|---|---|
| 0 | Project setup | Client + server scaffolded, both run with `npm run dev`, layout shell |
| 1 | Database schema & initial import | All Mongoose models and indexes. A one-time import of 184 products from the DummyJSON snapshot into MongoDB, with images on Cloudinary |
| 2 | Authentication | Sign up, sign in, sign out, session restore, protected routes |
| 3 | Homepage | Hero, category cards, product rows from real data |
| 4 | Navigation | Full header, sub-nav, account menu, cart badge, "All" category sidebar, footer |
| 5 | Top search | Search bar with department select and search-as-you-type suggestions, basic search results |
| 6 | Category & product listing pages | `/s` and `/c/:slug` with filter sidebar, sort, pagination |
| 7 | Product detail page | Gallery, variants, buy box, reviews, related products |
| 8 | Cart | Guest + server cart, merge on sign in, save for later |
| 9 | Checkout & payment | Server-side checkout, Stripe PaymentIntent, webhooks, payments, Buy Now |
| 10 | Order confirmation | Confirmation page with payment status polling and retry |
| 11 | Account & orders | Account hub, addresses, order history and detail, cancel + refund, buy again |
| 12 | Admin catalog management | Admin pages to create, edit, publish, and archive products, variants, images, and categories |
| 13 | Polish & testing | Responsive layout, all states, accessibility, end-to-end test |
| 14 | Deployment | Production build on a single origin, live Stripe webhook |

```
0 ─► 1 ─► 2 ─► 3 ─► 4 ─► 5 ─► 6 ─► 7 ─► 8 ─► 9 ─► 10 ─► 11 ─► 12 ─► 13 ─► 14
          │                         ▲         ▲                     ▲
          └── auth is needed by ────┴─────────┴─────────────────────┘
              (account menu in 4, cart merge in 8, checkout in 9, admin role in 12)
```

Phases 0–10 cover the core flow (Home → Search/Category → Product → Cart → Checkout → Confirmation). Phase 11 completes the shopper MVP with Orders. Phase 12 lets you manage the catalog yourself. Phases 13–14 make it production ready.

Phase 12 doesn't depend on phases 9–11, so it can be moved earlier (for example straight after Phase 7) if you want to start editing products sooner. Until it is built, products can be edited directly in MongoDB Compass or Atlas. The model hooks don't run on those edits, so run `npm run catalog:resync` afterwards to recalculate the derived price and stock fields.

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

## Phase 1: Database Schema & Initial Import

**Goal:** every collection is modeled and indexed, and the catalog is imported **once** from the DummyJSON snapshot into MongoDB. From then on the app reads products and categories only from MongoDB (03-database-schema §2).

**Backend**
- All 9 models exactly as in 03-database-schema §5:
  - `User` (+ addresses)
  - `Category` (+ `level`, `isActive`, `source`, audit fields)
  - `Product` (+ variants, `status`, hooks, `syncStockFields`)
  - `Review`
  - `Cart`
  - `Checkout` (TTL)
  - `Order` (+ status transition helper)
  - `Payment`
  - `StripeEvent` (TTL)
- All indexes from 03-database-schema §6.
- Import pipeline in `src/seed/`:
  1. `fetchSource.js` (`npm run seed:fetch`): calls `/products?limit=0` and `/products/categories` and writes both responses to `seed/data/`. **The output is committed to git.** This is the only code that ever calls DummyJSON.
  2. `categoryMap.js`: creates 6 departments and 22 categories, and drops `vehicle` and `motorcycle`.
  3. `transformProduct.js`: field mapping from 03-database-schema §3.3, with `status: "active"`, `source.provider: "dummyjson"`, `publishedAt`.
  4. `generateVariants.js`: rules from 03-database-schema §3.6.
  5. `generateReviews.js`: keeps the 3 source reviews, adds generated ones, and calculates `ratingAvg`, `ratingCount`, and `ratingBreakdown`.
  6. `uploadImages.js`: uploads with an encoded URL to `amazon-clone/products/<slug>/<n>` using `overwrite: false`. Already-uploaded images are skipped, at most 5 uploads run at a time, and the script prints progress.
  7. `seedUsersAndOrders.js`: demo user + admin, demo address, 4 historical orders with matching `payments`.
  8. `seed.js`:
     - **refuses to run if `products` or `categories` already contain documents**
     - `--reset` (development only, asks for confirmation) wipes everything and re-imports
     - otherwise runs steps 2–7, calls `syncIndexes()`, and prints a summary
  9. `resyncCatalog.js` (`npm run catalog:resync`): recalculates the derived fields on every product. Use it after editing products directly in Compass or Atlas.
- Unit tests:
  - `transformProduct` (cents rounding, list price rule, slug collision)
  - `generateVariants` (counts per category)
  - `Product` hooks (min/max price, inStock, `department` set from the category, one default variant)
  - The seed refuses to run against a non-empty catalog

**Frontend:** none.

**Done when**
- `npm run seed` on an empty database finishes and prints:
  - 28 categories
  - 184 products
  - about 310 variants
  - about 1,600 reviews
  - 2 users
  - 4 orders and 4 payments
  - 424 images
- Running `npm run seed` a second time refuses and changes nothing.
- `npm run seed -- --reset` re-imports without creating duplicate Cloudinary images.
- In Atlas or Compass:
  - a product document matches the schema
  - every index from 03-database-schema §6 is listed, including the two TTL indexes
- A product's Cloudinary URL opens in the browser.
- The seed makes no requests to `dummyjson.com/products` (check the log). It reads only `seed/data/`. Images already in Cloudinary are skipped by checking for their `public_id` with the Cloudinary Admin API, so they aren't fetched from the DummyJSON CDN again.

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
- `GET /api/products/home` returns `{ bestSellers, newArrivals, deals, topRated: [{ department, products }] }`. Each product has only the card fields (03-database-schema §7.1).
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

**Goal:** the complete global navigation: header, sub-nav, category sidebar, and footer.

**Backend:** `/auth/me` also returns `deliveryLocation: { city, zip } | null` from the default address (only those two fields). Otherwise uses `/categories`.

**Frontend**
- `Header` (dark `nav` color), left to right:
  - `NavLogo` → `/`
  - `DeliverTo`: "Deliver to {first name} {city}" from the default address, or "Deliver to" + "Update location" for guests. Display only.
  - Search area: placeholder slot, built in Phase 5
  - `AccountMenu`: "Hello, sign in" / "Hello, {name}" + "Account & Lists ▾". The hover/focus dropdown holds a Sign in button + "New customer? Start here" for guests, and Your Account / Your Orders / Sign out for signed-in users.
  - `OrdersLink`: "Returns & Orders" → `/orders`
  - `CartIcon`: count badge from `useCart().count`. Until Phase 8 this comes from the guest cart slice.
- `SubNav` (`nav-light`): "☰ All" button (opens the sidebar) + department links → `/c/:slug`.
- `CategorySidebar` (in a `Drawer`):
  - opened from "☰ All" on desktop and the ☰ menu button in the header on mobile
  - header: "Hello, {name}" or "Hello, sign in"
  - "Shop by Department" lists the 6 departments. Clicking one slides in a panel with its categories + "See all {department}" and a back arrow. Links go to `/c/:slug`.
  - "Help & Settings" section: Your Account, Returns & Orders, Sign in/out
  - closes on overlay click, Esc, or route change; keeps focus inside while open; locks body scroll
- `Footer`: "Back to top", 4 link columns, logo row.
- `CheckoutHeader`: logo + "Checkout" + lock icon, used on `/checkout`.
- `Layout` picks full, minimal, or checkout chrome based on the route (02-project-structure §2.3).
- Mobile (< 768px): the header becomes two rows (menu button/logo/account/cart, then the full-width search), "Deliver to" moves to a strip below it, "Returns & Orders" moves into the sidebar, the account dropdown becomes a plain link, and the sub-nav scrolls horizontally.
- Keyboard: the dropdown opens on focus, Esc closes it, and there is a "Skip to main content" link.

**Done when**
- The header, sub-nav, and footer appear on every full-layout page. Sign-in/up shows the minimal layout and checkout shows the checkout header.
- The account menu shows the correct content for guests and signed-in users, and Sign out works from it.
- The sidebar opens, drills down into a department's categories, goes back, navigates, and closes. It works with the keyboard alone.
- The navigation works at 375px, 768px, and 1440px widths and with the keyboard alone.

---

## Phase 5: Top Search

**Goal:** working global search.

**Backend**
- `GET /api/products` with basic search:
  - `q` → `$text`
  - `category` → department or category id
  - `page` and `limit`
  - default sort: relevance
- `search.service.js` takes the params and returns the query to run. Filters and the remaining sorts are added in Phase 6, still in this one service.
- Validated by `product.schema.js` (Zod): `q` max 100 chars, `page` ≥ 1, `limit` ≤ 48.
- `GET /api/products/suggestions?q=&category=` → `{ terms, categories, products }` (03-database-schema §7.2). Word-prefix matching, scoped to the selected department.
- Tests: text search finds "iPhone", category filtering by department vs category, invalid params → 400, suggestions match word prefixes, stay in the selected department, and treat regex characters as text.

**Frontend**
- `SearchBar`:
  - department `<select>` ("All", then the 6 departments), sized to fit the selected option like Amazon's
  - text input, and an orange submit button with a magnifier icon
  - submitting goes to `/s?k=<query>&category=<slug>`
  - the input and select are filled from the URL when you land on `/s`
  - the input gets an orange focus ring
  - suggestions: after 300 ms without typing, a dropdown lists related search terms (typed part normal, completion bold), matching departments/categories, and up to 5 products with thumbnail and price. Arrow keys move through them, Enter picks one, Esc closes. Terms go to `/s`, categories to `/c/:slug`, products to `/p/:slug`
- `SearchPage` (basic version): reads `k` and `category` (or the `/c/:slug` param), calls `searchProducts`, and shows a results count, a grid of `ProductCard`s, and Previous/Next links. Unknown slugs show the 404 page.

**Done when**
- Searching "laptop" with the department set to All shows the laptops. Searching "watch" with Fashion selected shows only watches.
- Search with an empty query does nothing. A search with no matches shows an empty state with suggestions.
- Reloading `/s?k=phone` keeps the input filled and the results the same.

---

## Phase 6: Category & Product Listing Pages

**Goal:** complete listing pages with filters, sorting, and pagination for both search results and categories.

**Backend**
- Complete `GET /api/products` (03-database-schema §7.2):
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
- `checkout.service.js`, using the `checkouts` collection (03-database-schema §5.6, §7.5):
  - `start(user, { source, item? })`: deletes the user's other open checkouts, copies the items, picks the default address, and calculates the quote. Returns the checkout + `issues`.
  - `update(checkoutId, { addressId?, deliveryMethod? })`: stores the address snapshot and recalculates the quote.
  - `place(checkoutId, { expectedTotalCents })`:
    1. Recalculate the quote. If the total differs, return `409 price_changed`.
    2. Transaction: conditional stock `$inc`, `syncStockFields`, insert the order (`checkout` is unique), checkout → `completed`.
    3. After commit: `payment.service.createIntent(order)` with idempotency key `pi-<orderId>`, then insert a `payments` document.
    4. Return `{ orderNumber, clientSecret }`.
  - If the same checkout is placed again, return the existing order and its `clientSecret`.
- `payment.service.js`: `createIntent`, `getClientSecret` (for `POST /orders/:orderNumber/payment-intent`), `cancelIntent`, `refund`.
- `stripeWebhook.service.js` + `POST /webhooks/stripe`:
  - `express.raw` and `constructEvent`
  - insert into `stripeEvents` (unique `eventId`) and skip events already processed
  - handle the event types listed in 03-database-schema §5.9, each in a transaction
  - on `succeeded`, check the amount and currency match the order before marking it paid
  - return 500 if processing fails, so Stripe retries
  - **`payment_failed` does not cancel the order.** It records `lastError` so the user can retry.
- `jobs/expirePendingOrders.js` (every 60 s):
  1. cancel the PaymentIntent
  2. release the stock
  3. order → `cancelled` (`reservation_expired`) and payment → `canceled`
  - Skip orders whose PaymentIntent is `succeeded` or `processing`.
- Tests (with Stripe mocked; webhooks signed with `generateTestHeaderString`):
  - the quote ignores any prices sent by the client
  - `price_changed` when a variant's price changes between quote and place
  - insufficient stock → 409 and nothing is written
  - placing the same checkout twice → one order, one PaymentIntent
  - the same webhook event delivered twice → applied once
  - an amount mismatch → the order isn't marked paid
  - `payment_failed` leaves the order `pending_payment`
  - expiry releases the stock and cancels the PaymentIntent
  - a payment that succeeds after the order expired → automatic refund

**Frontend**
- `checkoutApi.js`: `startCheckout`, `getCheckout`, `updateCheckout`, `placeOrder`, `retryPaymentIntent`. `checkoutSlice` only holds `checkoutId` and `buyNowItem`.
- When `/checkout` opens, call `startCheckout` (from the cart, or with `buyNowItem`). After a reload, `getCheckout(checkoutId)` restores the same checkout.
- `CheckoutPage` with `CheckoutHeader`: numbered sections, one open at a time (like Amazon's):
  1. **Shipping address**: choose from saved addresses or "Add a new address" (`AddressForm` in a `Modal`). Choosing one calls `updateCheckout`.
  2. **Delivery**: radio buttons with the price and date for Standard / Expedited / Next Day. Choosing one calls `updateCheckout`.
  3. **Payment**: Stripe `CardElement` styled to match. Card errors appear inline.
  4. **Review items**: the checkout items with any `issues` (out of stock, price changed), and a "Change" link back to the cart.
- `OrderSummary` sticky sidebar:
  - shows `checkout.quote`: Items, Shipping & handling, Total before tax, Estimated tax, **Order total**
  - "Place your order" (yellow) is disabled until an address is chosen, there are no blocking issues, and the card form is complete
- Placing the order:
  1. `placeOrder({ expectedTotalCents })`
  2. `stripe.confirmCardPayment(clientSecret, { payment_method: { card } })`
  3. navigate to `/order/:orderNumber/confirmation`
  - If the card is declined: show Stripe's message, keep the user on the payment step, and retry with the **same** `clientSecret`.
  - `409 price_changed`: show the new total and ask the user to confirm again.
  - `409 out_of_stock`: go back to the cart with a notice.
- Buy Now from the product page: `startCheckout({ source: "buy_now", item })`. The cart doesn't change.
- Run `npm run stripe:listen` during this phase.

**Done when**
- Test card `4242 4242 4242 4242`:
  - gives a `paid` order and a `succeeded` payment showing card brand and last 4
  - the stock goes down, those items leave the cart, and `salesCount` goes up
- Card `4000 0000 0000 0002` (declined):
  - shows the error, and the order stays `pending_payment`
  - retrying with 4242 succeeds on the **same** order and payment, with `failedAttempts: 1`
- Card `4000 0025 0000 3155` (3-D Secure) shows the authentication modal and completes.
- Double-clicking "Place your order" creates one order and one PaymentIntent.
- `stripe events resend <evt_id>` for an event already processed changes nothing.
- An order left unpaid for 30 minutes (set to 1 minute in development) is cancelled, its stock is restored, and its PaymentIntent is cancelled in Stripe.
- Two browsers buying the last unit at the same moment: one succeeds and the other gets an out-of-stock message.
- Buy Now completes a purchase without changing the cart.
- Changing a variant's price in Compass while a checkout is open (then `npm run catalog:resync`) triggers the "price changed" confirmation.
- Reloading the checkout page keeps the selected address and delivery method.

---

## Phase 10: Order Confirmation

**Goal:** a clear confirmation page after payment.

**Backend**
- `GET /orders/:orderNumber`: available only to the order's owner, otherwise 404. Includes the payment summary (`status`, `lastError.message`, card, `receiptUrl`).
- `POST /orders/:orderNumber/payment-intent`: returns the `clientSecret` of the order's PaymentIntent while the order is `pending_payment`.

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
  - If the payment has a `lastError` and the order is still pending: show the error + "Try another card". This gets the `clientSecret` with `retryPaymentIntent` and shows the card form again.
  - If the order was cancelled (reservation expired): explain this, and link back to the cart.
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
  - shipping address, payment method (brand •••• last4), Stripe receipt link, refunds (if any)
  - order summary, items
  - Cancel button with confirmation modal when cancellable

**Done when**
- The demo user sees 4 seeded orders plus any new ones, with the correct statuses and filters.
- Cancelling a paid order:
  - changes it to Cancelled and puts the stock back
  - creates a refund in the Stripe dashboard
  - after the `charge.refunded` webhook, the order detail shows `Refunded`
- Buy it again adds the items to the cart and opens the cart.
- After `npm run orders:advance` the status and timeline update.

---

## Phase 12: Admin Catalog Management

**Goal:** you can manage products and categories yourself in the app, with no scripts or direct database edits.

**Backend**
- `routes/admin/index.js`: everything under `/api/admin` goes through `protect` + `requireAdmin`.
- `adminProduct.service.js` (03-database-schema §5.3, §7.8):
  - list with `q`, `status`, `category`, `page`, sorted by `updatedAt`
  - get by id (all fields, including inactive variants)
  - create (`status: "draft"`, `source.provider: "manual"`, `createdBy`)
  - update via `findById` → assign → `save()`, so the hooks run
  - variant rules: unique SKU, exactly one default, variants that have been ordered can only be deactivated
  - publish: requires at least 1 image and at least 1 active variant with price > 0. Sets `publishedAt` the first time
  - archive
  - delete: only a draft that has never been ordered
  - after an image is removed and the product saved, delete the image from Cloudinary
- `adminCategory.service.js`:
  - create and update (unique slug, parent must be a department)
  - moving a category to a new department updates its products' `department` in a transaction
  - delete is blocked while any products or child categories reference it
  - deactivate
- `admin/review.routes.js`: delete a review and recalculate the product's rating fields.
- `image.service.js` + `POST /admin/uploads`:
  - multer memory storage, `image/jpeg|png|webp`, max 5 MB
  - streams to Cloudinary `amazon-clone/products/<productId>/`
  - returns `{ url, publicId }`
- Zod schemas for every admin body (`validators/admin/`). Unknown fields are rejected, so `department`, `ratingAvg`, `salesCount`, and the derived fields can't be set by the client.
- Tests:
  - a non-admin gets 403
  - create → publish → visible in `/products`, and archive → hidden
  - duplicate SKU → 409
  - deleting an ordered product → 409
  - deleting a category that has products → 409
  - moving a category updates its products' `department`

**Frontend**
- `AdminRoute`, `AdminLayout` (side nav: Products, Categories, "Back to store"). An "Admin" link appears in the account menu for admins only.
- `AdminProductsPage`:
  - table with thumbnail, title, SKU count, price range, total stock, status pill, and updated date
  - search box, status and category filters, pagination
  - "Add product" button
- `AdminProductEditPage` (create and edit):
  - `ProductForm`: title, slug (auto, editable), brand, category select (grouped by department), description, bullets (add/remove/reorder), tags, specs
  - `VariantEditor`: option name + rows of label, SKU, price, list price, stock, default (radio), active
  - `ImageManager`: drag-and-drop upload with progress, reorder, alt text, remove
  - status actions (Save draft, Publish, Archive), with the validation errors from the server shown on the fields
  - unsaved-changes warning when leaving the page
- `AdminCategoriesPage`: department → category tree, add/edit in a modal (name, slug, parent, image, sort order, active), and delete with a clear message when it is blocked.
- Prices are entered in dollars and converted to cents before sending. The API always works in cents.

**Done when**
- Signed in as `admin@example.com`, you can:
  - create a new product with 2 variants and 3 uploaded images, then publish it
  - find it in search and its category page, and buy it
- Editing a price is reflected on the product page and in any new cart quote. Orders that already exist still show the old price.
- Archiving the product removes it from search and the product page (404). It still appears correctly in past orders.
- Creating a new category under a department shows it in the "All" sidebar and the filter sidebar.
- The demo user gets a 404 at `/admin/products` and a 403 from `/api/admin/products`.

---

## Phase 13: Polish & Testing

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
  - every order/cart/checkout/address query filters by `req.user._id`
  - every `/api/admin` route rejects non-admins
  - Zod on every input
  - go through the checklist in 05-coding-standards §8
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

  plus one test for a guest-cart merge and one for an admin creating and publishing a product that then appears in search.
- README: features, screenshots, setup, test cards, demo login.

**Done when:** the end-to-end tests pass locally, the Lighthouse targets are met, and no page has a layout bug at the sizes listed.

---

## Phase 14: Deployment

**Goal:** a public demo with the same behavior as local.

- **Single origin:** in production Express serves `client/dist` as static files, with a fallback to `index.html` for client-side routes. The cookie stays first-party and needs no CORS. Deploy as one web service (for example Render or Railway) with the build command `npm run build --prefix client && npm install --prefix server`.
- Production env vars on the host. MongoDB Atlas network access must allow the host.
- Stripe: add a webhook endpoint in the dashboard (`https://<host>/api/webhooks/stripe`) and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Stay in **test mode**. Subscribe it to these events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.processing`
  - `payment_intent.requires_action`
  - `payment_intent.canceled`
  - `charge.refunded`
- Import the catalog into the production database **once** with `npm run seed`. From then on, manage it through `/admin` (the seed refuses to run again, and `--reset` is blocked in production).
- Smoke test: run the end-to-end flow by hand on the live URL.

**Done when:** the live URL completes the core flow with a test card, and the order appears in Your Orders.

---

## After the MVP

These items are out of MVP scope. They're listed in rough priority order:

1. Typo-tolerant search and autocomplete (Atlas Search)
2. Writing reviews (verified purchasers only)
3. Wishlists
4. "Inspired by your browsing history" row
5. Password reset email
6. Order confirmation email
7. Admin order management (mark shipped/delivered in the UI instead of `orders:advance`)
8. Bulk product import from CSV in the admin pages
9. Returns
