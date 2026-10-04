# Project Structure

This document defines how the code is organized: the frontend (`client/`) and the backend (`server/`) are covered separately. It describes what lives in each folder, the rules for where new code goes, and how a request moves through both sides.

Related docs: [01-initial-plan.md](01-initial-plan.md), [03-database-schema.md](03-database-schema.md), [04-development-phases.md](04-development-phases.md), [05-coding-standards.md](05-coding-standards.md).

---

## 1. Repository Layout

```
AmazonClone/
├── client/                 # React + Vite frontend
├── server/                 # Node + Express API
├── e2e/                    # Playwright end-to-end tests (core flow)
├── planning-docs/          # Planning documents (this folder)
├── .claude/, .agent-logs/  # Agent capture tooling (not part of the app)
├── package.json            # Root scripts: dev, seed, stripe:listen, test:e2e
├── .gitignore
└── README.md
```

- `client/` and `server/` each have their own `package.json` and `node_modules`. They share no code.
- The root `package.json` only runs scripts and holds `concurrently` and Playwright. Its `npm run dev` starts both apps.
- In development the client runs on `:5173` and proxies `/api/*` to the server on `:5000`, so the browser sees a single origin.
- The empty `Amazon-Clone/` folder at the root is not used and can be deleted.

---

## 2. Frontend (`client/`)

### 2.1 Tree

```
client/
├── index.html
├── vite.config.js                 # react + tailwind plugins, /api proxy
├── eslint.config.js
├── package.json
├── .env.example                   # VITE_STRIPE_PUBLISHABLE_KEY, VITE_CLOUDINARY_CLOUD_NAME
├── public/
│   ├── favicon.svg
│   └── logo.svg                   # Our own logo (no Amazon branding)
└── src/
    ├── main.jsx                   # <Provider store> <RouterProvider> <Elements stripe>
    ├── App.jsx                    # Bootstraps session (useGetMeQuery), renders <Layout>
    ├── router.jsx                 # createBrowserRouter route table
    ├── index.css                  # @import "tailwindcss"; @theme tokens
    │
    ├── app/
    │   ├── store.js               # configureStore: api reducer + slices, localStorage sync
    │   └── listenerMiddleware.js  # signed in → merge guest cart, signed out → reset api state
    │
    ├── features/                  # Redux logic, one folder per domain
    │   ├── api/
    │   │   └── apiSlice.js        # createApi, baseUrl '/api', credentials 'include', tagTypes
    │   ├── auth/
    │   │   ├── authApi.js         # signup, signin, signout, me
    │   │   └── authSlice.js       # { user, status: 'idle'|'loading'|'authenticated'|'guest' }
    │   ├── catalog/
    │   │   └── catalogApi.js      # getCategories, getHome, searchProducts, getProduct, getReviews
    │   ├── cart/
    │   │   ├── cartApi.js         # getCart, addItem, updateItem, removeItem, mergeCart, previewCart
    │   │   └── guestCartSlice.js  # { items: [{ productId, variantId, qty, savedForLater }] }
    │   ├── checkout/
    │   │   ├── checkoutApi.js     # startCheckout, getCheckout, updateCheckout, placeOrder, retryPaymentIntent
    │   │   └── checkoutSlice.js   # { checkoutId, buyNowItem }
    │   ├── orders/
    │   │   └── ordersApi.js       # getOrders, getOrder, cancelOrder, buyAgain
    │   ├── account/
    │   │   └── addressesApi.js    # list/create/update/delete/setDefault
    │   ├── admin/
    │   │   ├── adminProductsApi.js    # list, get, create, update, setStatus, delete draft
    │   │   ├── adminCategoriesApi.js  # list, create, update, delete
    │   │   └── adminUploadsApi.js     # uploadImage
    │   └── ui/
    │       └── uiSlice.js         # { sidebarOpen, toasts[] }
    │
    ├── pages/                     # One file per route. Composes components, little logic of its own
    │   ├── HomePage.jsx
    │   ├── SearchPage.jsx         # Serves both /s and /c/:slug
    │   ├── ProductPage.jsx
    │   ├── CartPage.jsx
    │   ├── SignInPage.jsx
    │   ├── SignUpPage.jsx
    │   ├── CheckoutPage.jsx
    │   ├── OrderConfirmationPage.jsx
    │   ├── AccountPage.jsx
    │   ├── AddressesPage.jsx
    │   ├── OrdersPage.jsx
    │   ├── OrderDetailPage.jsx
    │   ├── NotFoundPage.jsx
    │   └── admin/
    │       ├── AdminProductsPage.jsx      # Table: search, status/category filters, pagination
    │       ├── AdminProductEditPage.jsx   # Create and edit (same form)
    │       └── AdminCategoriesPage.jsx    # Department/category tree with inline edit
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Layout.jsx         # Picks full / minimal / checkout chrome from the route's handle.layout
    │   │   ├── Header.jsx
    │   │   ├── NavLogo.jsx
    │   │   ├── DeliverTo.jsx      # "Deliver to {name} {city}" from the default address
    │   │   ├── SearchBar.jsx      # Department <select> + input + submit, autocomplete combobox
    │   │   ├── DepartmentSelect.jsx
    │   │   ├── SearchSuggestions.jsx # Suggestion dropdown (terms, departments, products)
    │   │   ├── AccountMenu.jsx    # "Hello, sign in / Account & Lists" hover dropdown
    │   │   ├── OrdersLink.jsx     # "Returns & Orders"
    │   │   ├── CartIcon.jsx       # Count badge (guest or server cart)
    │   │   ├── SubNav.jsx         # "All" button + department links
    │   │   ├── CategorySidebar.jsx# Slide-out drawer: departments → categories
    │   │   ├── Footer.jsx         # Back to top + link columns
    │   │   └── CheckoutHeader.jsx # Minimal header used on /checkout
    │   ├── home/
    │   │   ├── HeroCarousel.jsx
    │   │   ├── CategoryCard.jsx   # 2×2 tile card
    │   │   ├── CategoryCardGrid.jsx
    │   │   └── ProductRow.jsx     # Horizontal scroller of ProductCardCompact
    │   ├── product/
    │   │   ├── ProductCard.jsx    # Listing card (image, title, rating, price, delivery)
    │   │   ├── ProductCardCompact.jsx
    │   │   ├── ImageGallery.jsx
    │   │   ├── ImageLightbox.jsx  # Full-screen image modal with arrows
    │   │   ├── ProductSummary.jsx # Title, brand link, rating, price, variants, bullets
    │   │   ├── VariantSelector.jsx
    │   │   ├── BuyBox.jsx         # Price, stock, delivery, qty, Add to Cart, Buy Now
    │   │   ├── QtyInput.jsx       # Numeric quantity field, 1 to min(stock, 30)
    │   │   ├── AboutThisItem.jsx
    │   │   ├── ProductInfoTable.jsx
    │   │   ├── RatingHistogram.jsx
    │   │   └── ReviewList.jsx
    │   ├── search/
    │   │   ├── FilterSidebar.jsx  # Category tree, price, rating, brand, in stock
    │   │   ├── PriceFilter.jsx
    │   │   ├── RatingFilter.jsx
    │   │   ├── BrandFilter.jsx
    │   │   ├── SortSelect.jsx
    │   │   ├── ResultsHeader.jsx  # "1-24 of 38 results for 'phone'"
    │   │   ├── ActiveFilters.jsx  # Removable filter chips
    │   │   └── Pagination.jsx
    │   ├── cart/
    │   │   ├── CartItem.jsx
    │   │   ├── SavedItem.jsx
    │   │   ├── CartLineDetails.jsx # Image, title, stock, variant, price-changed notice
    │   │   ├── QtyStepper.jsx     # Trash/− · qty · + (minus becomes Delete at 1)
    │   │   └── SubtotalBox.jsx
    │   ├── checkout/
    │   │   ├── CheckoutForm.jsx   # Numbered sections + summary; one section open at a time
    │   │   ├── CheckoutSection.jsx
    │   │   ├── AddressStep.jsx
    │   │   ├── AddressSummary.jsx
    │   │   ├── DeliveryStep.jsx
    │   │   ├── PaymentStep.jsx    # Stripe <CardElement>
    │   │   ├── ReviewItemsStep.jsx
    │   │   └── OrderSummary.jsx   # Sticky sidebar with totals + Place order
    │   ├── account/
    │   │   ├── AddressForm.jsx
    │   │   ├── RegionFields.jsx   # Country → state/province → city (suggestions)
    │   │   └── AddressCard.jsx
    │   ├── orders/
    │   │   ├── OrderCard.jsx
    │   │   ├── OrderTimeline.jsx
    │   │   └── StatusBadge.jsx
    │   ├── admin/
    │   │   ├── AdminLayout.jsx    # Side nav (Products, Categories) + content area
    │   │   ├── ProductForm.jsx    # Details, category, bullets, specs, status
    │   │   ├── VariantEditor.jsx  # Rows: label, SKU, price, list price, stock, default, active
    │   │   ├── ImageManager.jsx   # Upload, reorder, alt text, remove
    │   │   ├── CategoryForm.jsx
    │   │   └── ProductStatusPill.jsx
    │   └── ui/                    # Generic, domain-free building blocks
    │       ├── Button.jsx         # variants: yellow, orange, outline, link
    │       ├── Input.jsx
    │       ├── Select.jsx
    │       ├── StarRating.jsx
    │       ├── Price.jsx          # $19<sup>99</sup> Amazon-style, list price, % off
    │       ├── Spinner.jsx
    │       ├── Skeleton.jsx
    │       ├── Modal.jsx
    │       ├── Drawer.jsx
    │       ├── Toast.jsx
    │       ├── EmptyState.jsx
    │       └── ErrorState.jsx
    │
    ├── routes/
    │   ├── ProtectedRoute.jsx     # Not signed in → /signin?redirect=<current>
    │   ├── GuestOnlyRoute.jsx     # Already signed in → away from /signin, /signup
    │   └── AdminRoute.jsx         # Not admin → 404 page (doesn't reveal that admin pages exist)
    │
    ├── hooks/
    │   ├── useAuth.js             # { user, isAuthenticated, isLoading }
    │   ├── useCart.js             # One interface over the guest cart and the server cart
    │   ├── useSearchParamsState.js# Read/write filter state in the URL
    │   ├── useFocusTrap.js       # Focus trap, Esc, scroll lock for Modal and Drawer
    │   ├── useLineAction.js      # Pending + error state for one cart line
    │   ├── useCheckoutSession.js # restore (reload) or start a checkout; waits for guest-cart merge
    │   ├── usePlaceOrder.js      # place → confirmCardPayment → confirmation; retries reuse the PI
    │   └── useDebounce.js
    │
    ├── utils/
    │   ├── money.js               # formatCents(1999) → "$19.99", splitCents → { dollars, cents }
    │   ├── cloudinary.js          # imageUrl(url, { w, h }) → inserts f_auto,q_auto,w_…
    │   ├── delivery.js            # Estimated date text ("Tuesday, Oct 14")
    │   └── constants.js           # DELIVERY_METHODS, PAGE_SIZE, MAX_QTY
    │
    └── test/
        └── setup.js               # Vitest + Testing Library setup
```

### 2.2 Folder rules

| Folder | Contains | Must not contain |
|---|---|---|
| `pages/` | Route-level components: read params, call hooks/queries, arrange components | Reusable UI, direct `fetch` calls |
| `components/<domain>/` | UI for one domain. Receives data via props or domain hooks | Route definitions |
| `components/ui/` | Generic primitives with no knowledge of products, carts, etc. | Redux or API imports |
| `features/<domain>/` | RTK Query endpoints (`*Api.js`) and slices (`*Slice.js`) | JSX |
| `hooks/` | Hooks shared across domains | Domain UI |
| `utils/` | Pure functions | React or Redux imports |

- **Server data always goes through RTK Query.** Each domain calls `apiSlice.injectEndpoints()` so there is a single cache and a single `api` reducer.
- **Client-only state goes in slices:** `auth`, `guestCart`, `checkout`, `ui`.
- **URL state:** search query, filters, sort, page, and selected variant live in the URL. They are not stored in Redux.

### 2.3 Route map

| Path | Page | Access | Layout |
|---|---|---|---|
| `/` | HomePage | Public | Full |
| `/s` | SearchPage | Public | Full |
| `/c/:slug` | SearchPage (category preset) | Public | Full |
| `/p/:slug` | ProductPage | Public | Full |
| `/cart` | CartPage | Public | Full |
| `/signin`, `/signup` | SignInPage, SignUpPage | Guest only | Minimal (logo only) |
| `/checkout` | CheckoutPage | Protected | Checkout header |
| `/order/:orderNumber/confirmation` | OrderConfirmationPage | Protected | Full |
| `/account` | AccountPage | Protected | Full |
| `/account/addresses` | AddressesPage | Protected | Full |
| `/orders` | OrdersPage | Protected | Full |
| `/orders/:orderNumber` | OrderDetailPage | Protected | Full |
| `/admin/products` | AdminProductsPage | Admin | Admin |
| `/admin/products/new`, `/admin/products/:id` | AdminProductEditPage | Admin | Admin |
| `/admin/categories` | AdminCategoriesPage | Admin | Admin |
| `*` | NotFoundPage | Public | Full |

Pages are lazy loaded (`React.lazy`), apart from Home and Search. The admin pages are in their own chunk, so shoppers never download them.

### 2.4 Redux store shape

```js
{
  api: { /* RTK Query cache */ },
  auth:      { user: { _id, name, email, role, deliveryLocation: { city, zip } | null } | null, status: 'idle' | 'authenticated' | 'guest' },
  guestCart: { items: [{ productId, variantId, qty, savedForLater }] },   // persisted to localStorage
  checkout:  { checkoutId: string | null, buyNowItem: { productId, variantId, qty } | null },
  ui:        { sidebarOpen: false, toasts: [] }
}
```

The selected address, delivery method, and price quote are stored on the server in the `checkouts` collection, not in Redux. That way a page reload keeps the checkout as it was, and prices can only come from the server.

- **Tag types:** `Me`, `Cart`, `Checkout`, `Orders`, `Order`, `Addresses`, `AdminProducts`, `AdminCategories`. Shopper catalog data is never invalidated during a session. Admin changes invalidate the admin tags, and shopper pages see the changes the next time they load.
- **Listener middleware:**
  - When `signin` or `signup` is fulfilled: if `guestCart.items` is not empty, call `mergeCart`, clear `guestCart`, and invalidate `Cart`.
  - When `signout` is fulfilled: run `api.util.resetApiState()` and reset the `checkout` slice.
- **`useCart()`** returns the same interface (`items`, `count`, `subtotalCents`, `add`, `update`, `remove`, `saveForLater`) for both kinds of user, so components don't need to know whether the user is signed in. Guests' items get their details from `POST /api/cart/preview`.

### 2.5 Styling conventions

- Tailwind utilities only. The only stylesheet is `index.css`, which holds the `@theme` tokens: `nav`, `nav-light`, `accent`, `btn-yellow`, `btn-orange`, `link`, `price`.
- Desktop-first layout like Amazon, with breakpoints so it works down to 375px. At mobile widths the filter sidebar collapses into a drawer.
- Product images always go through `utils/cloudinary.js` so they are sized for where they appear (card 300px, gallery 600px, thumbnail 80px).

### 2.6 Naming

- Components and pages: `PascalCase.jsx`. Hooks: `useThing.js`. Everything else: `camelCase.js`.
- One component per file, default export. Utilities use named exports.
- RTK Query hooks keep the generated names (`useSearchProductsQuery`, `useAddCartItemMutation`).

---

## 3. Backend (`server/`)

### 3.1 Tree

```
server/
├── package.json                   # "type": "module"
├── .env.example
├── vitest.config.js
└── src/
    ├── server.js                  # Load env, connect DB, start jobs, app.listen
    ├── app.js                     # Build the Express app (exported for tests)
    │
    ├── config/
    │   ├── env.js                 # Zod-validated process.env. Exits on missing vars
    │   ├── db.js                  # mongoose.connect, connection events
    │   ├── cloudinary.js          # cloudinary.config(...)
    │   └── stripe.js              # new Stripe(secret)
    │
    ├── models/
    │   ├── User.js                # + addressSchema
    │   ├── Category.js
    │   ├── Product.js             # + variantSchema, pre('save') denormalization, syncStockFields()
    │   ├── Review.js
    │   ├── Cart.js                # + cartItemSchema
    │   ├── Checkout.js            # TTL on expiresAt for open checkouts
    │   ├── Order.js               # + orderItemSchema, status transition helper
    │   ├── Payment.js             # + refundSchema
    │   └── StripeEvent.js         # TTL 90 days
    │
    ├── routes/
    │   ├── index.js               # Mounts every router under /api
    │   ├── health.routes.js       # GET /health
    │   ├── auth.routes.js
    │   ├── category.routes.js
    │   ├── product.routes.js
    │   ├── cart.routes.js
    │   ├── checkout.routes.js
    │   ├── address.routes.js      # /users/me/addresses
    │   ├── order.routes.js
    │   ├── webhook.routes.js      # Mounted before express.json()
    │   └── admin/
    │       ├── index.js           # protect + requireAdmin for everything under /admin
    │       ├── product.routes.js
    │       ├── category.routes.js
    │       ├── review.routes.js
    │       └── upload.routes.js
    │
    ├── controllers/               # Thin: read req, call service, send res
    │   ├── auth.controller.js
    │   ├── category.controller.js
    │   ├── product.controller.js
    │   ├── cart.controller.js
    │   ├── checkout.controller.js
    │   ├── address.controller.js
    │   ├── order.controller.js
    │   ├── webhook.controller.js
    │   └── admin/
    │       ├── product.controller.js
    │       ├── category.controller.js
    │       ├── review.controller.js
    │       └── upload.controller.js
    │
    ├── services/                  # Business logic. No req/res
    │   ├── auth.service.js        # hash, verify, issue token
    │   ├── catalog.service.js     # category tree, home rows, search listing (active only)
    │   ├── product.service.js     # product by slug, reviews, related (active only)
    │   ├── search.service.js      # params → { filter, sort, skip, limit }, facets
    │   ├── suggestion.service.js  # search-as-you-type: terms, categories, products
    │   ├── cart.service.js        # add/update/remove/merge/preview, removePurchasedItems
    │   ├── cartView.service.js    # hydrate cart lines + subtotal summary
    │   ├── pricing.service.js     # subtotal, shipping, tax, total, delivery dates
    │   ├── checkout.service.js    # start, get, update, place (idempotent per checkout)
    │   ├── checkoutPricing.service.js # price items from current data, issues, quote, delivery options
    │   ├── order.service.js       # createOrder (txn: claim checkout, reserve stock, insert order)
    │   ├── inventory.service.js   # reserveStock / releaseStock / recordSales (session-aware)
    │   ├── payment.service.js     # ensurePaymentIntent (one per order), cancel, refund
    │   ├── stripeWebhook.service.js # verify, record in stripeEvents, dispatch by event type
    │   ├── address.service.js
    │   ├── location.service.js    # countries/states/cities lists, normalizeRegion for addresses
    │   ├── image.service.js       # Buffer → Cloudinary upload stream, destroy by publicId
    │   ├── adminProduct.service.js  # CRUD, publish/archive, variant rules, image cleanup
    │   └── adminCategory.service.js # CRUD, reparent (txn), delete guards
    │
    ├── middleware/
    │   ├── protect.js             # JWT cookie → req.user, else 401
    │   ├── optionalAuth.js        # Attaches req.user if the cookie is present
    │   ├── requireAdmin.js
    │   ├── validate.js            # validate({ body, query, params }) with Zod
    │   ├── rateLimit.js           # authLimiter, apiLimiter
    │   ├── upload.js              # multer memoryStorage, image/* only, 5 MB
    │   ├── notFound.js
    │   └── errorHandler.js        # ApiError / Zod / Mongoose / JWT → JSON response
    │
    ├── validators/                # Zod schemas, one file per resource
    │   ├── common.js              # shared objectId helper
    │   ├── auth.schema.js
    │   ├── product.schema.js      # search query params
    │   ├── cart.schema.js
    │   ├── checkout.schema.js
    │   ├── address.schema.js
    │   ├── order.schema.js
    │   └── admin/
    │       ├── product.schema.js
    │       └── category.schema.js
    │
    ├── utils/
    │   ├── asyncHandler.js
    │   ├── ApiError.js            # new ApiError(404, 'Product not found', details?)
    │   ├── token.js               # signToken, verifyToken, setAuthCookie, clearAuthCookie
    │   ├── orderNumber.js         # 112-XXXXXXX-XXXXXXX
    │   ├── money.js               # dollarsToCents, centsToDollars
    │   └── dates.js               # addBusinessDays
    │
    ├── jobs/
    │   └── expirePendingOrders.js # every 60 s: cancel PI, release stock, order → cancelled
    │
    ├── seed/                      # Initial import only. The app never reads these files at runtime
    │   ├── seed.js                # npm run seed (refuses if the catalog isn't empty) / -- --reset (dev only)
    │   ├── fetchSource.js         # npm run seed:fetch → data/dummyjson-*.json
    │   ├── categoryMap.js         # 6 departments ← 22 DummyJSON slugs
    │   ├── transformProduct.js    # DummyJSON product → Product doc
    │   ├── generateVariants.js    # Variant rules per category
    │   ├── generateReviews.js     # Extra reviews via faker
    │   ├── uploadImages.js        # Cloudinary upload with deterministic public_id
    │   ├── seedUsersAndOrders.js  # Demo + admin users, demo order history
    │   ├── advanceOrders.js       # npm run orders:advance (paid → shipped → delivered)
    │   ├── resyncCatalog.js       # npm run catalog:resync
    │   └── data/
    │       ├── dummyjson-products.json
    │       └── dummyjson-categories.json
    │
    └── tests/
        ├── setup.js               # MongoMemoryReplSet (transactions need a replica set)
        ├── helpers.js             # createUser, signInAgent, seedProduct
        ├── auth.test.js
        ├── search.test.js
        ├── cart.test.js
        ├── pricing.test.js
        ├── checkout.test.js
        ├── webhook.test.js        # Signed test payloads via stripe.webhooks.generateTestHeaderString
        ├── order.test.js
        └── admin.test.js
```

### 3.2 Layers

```
Request → router → middleware (rateLimit, protect, validate) → controller → service → model → MongoDB
                                                                    └──► Stripe / Cloudinary
Response ◄── controller (res.status().json()) ◄── service return value
Errors   ──► throw ApiError anywhere ──► asyncHandler ──► errorHandler ──► { message, details }
```

| Layer | Responsibility | Rules |
|---|---|---|
| `routes/` | URL + HTTP method → middleware chain → controller | No logic |
| `middleware/` | Cross-cutting concerns: auth, validation, uploads, errors | |
| `controllers/` | Read `req.params/query/body/user`, call one or more services, shape the response | No Mongoose queries |
| `services/` | Business rules, queries, transactions, calls to external APIs | No `req`/`res`. Unit testable |
| `models/` | Schemas, indexes, hooks, small instance/static helpers | No business workflows |

### 3.3 Middleware order (`app.js`)

```js
app.set('trust proxy', 1)
app.use(helmet())
app.use('/api/webhooks', webhookRoutes)        // express.raw() inside, before json parsing
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use(cors({ origin: env.CLIENT_URL, credentials: true }))  // only needed outside the dev proxy
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use('/api', apiLimiter, routes)
app.use(notFound)
app.use(errorHandler)
```

### 3.4 Endpoints by router

| Router | Endpoints | Auth |
|---|---|---|
| `health` | `GET /health` | – |
| `auth` | `POST /auth/signup`, `POST /auth/signin`, `POST /auth/signout`, `GET /auth/me` | `me`: protect |
| `category` | `GET /categories` | – |
| `product` | `GET /products`, `GET /products/home`, `GET /products/suggestions`, `GET /products/:slug`, `GET /products/:slug/reviews`, `GET /products/:slug/related` | – |
| `cart` | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:itemId`, `DELETE /cart/items/:itemId`, `POST /cart/merge`, `POST /cart/preview` | protect (except `preview`) |
| `checkout` | `POST /checkout` (start: `{ source, item? }`), `GET /checkout/:id`, `PATCH /checkout/:id` (`{ addressId?, deliveryMethod? }`), `POST /checkout/:id/place` (`{ expectedTotalCents }` → `{ orderNumber, clientSecret }`) | protect, owner only |
| `address` | `GET/POST /users/me/addresses`, `PATCH/DELETE /users/me/addresses/:id`, `POST /users/me/addresses/:id/default` | protect |
| `order` | `GET /orders`, `GET /orders/:orderNumber`, `POST /orders/:orderNumber/payment-intent` (get or create the `clientSecret` for a retry), `POST /orders/:orderNumber/cancel`, `POST /orders/:orderNumber/buy-again` | protect, owner only |
| `webhook` | `POST /webhooks/stripe` | Stripe signature |
| `admin/product` | `GET /admin/products`, `GET /admin/products/:id`, `POST /admin/products`, `PATCH /admin/products/:id`, `POST /admin/products/:id/status` (`{ status }`), `DELETE /admin/products/:id` (drafts never ordered only) | protect + requireAdmin |
| `admin/category` | `GET /admin/categories`, `POST /admin/categories`, `PATCH /admin/categories/:id`, `DELETE /admin/categories/:id` | protect + requireAdmin |
| `admin/review` | `DELETE /admin/reviews/:id` | protect + requireAdmin |
| `admin/upload` | `POST /admin/uploads` (multipart `image`) → `{ url, publicId }`, `DELETE /admin/uploads` (`{ publicId }`) | protect + requireAdmin |

The admin product endpoints return every product with every field, including drafts and archived products. The shopper endpoints (`/products`) return only active products, active variants, and the fields shoppers need.

### 3.5 Response conventions

- Success responses return the resource directly (`{ ...product }`) or a list wrapper (`{ items, total, page, pages }`).
- Error responses have the shape `{ message, details? }`:
  - `400` validation (`details` = `[{ path, message }]`, one entry per invalid field)
  - `401` not signed in
  - `403` not allowed
  - `404` not found
  - `409` conflict (e.g. out of stock, with `details.items`)
  - `500` unexpected (stack trace only in development)
- Money fields always end in `Cents` and are integers.
- Dates are ISO strings.

### 3.6 Scripts (`server/package.json`)

| Script | Command |
|---|---|
| `dev` | `node --watch src/server.js` |
| `start` | `node src/server.js` |
| `seed` | `node src/seed/seed.js` |
| `seed:reset` | `node src/seed/seed.js --reset` (development only. Wipes all data, including admin edits) |
| `seed:fetch` | `node src/seed/fetchSource.js` |
| `orders:advance` | `node src/seed/advanceOrders.js` |
| `catalog:resync` | `node src/seed/resyncCatalog.js` (recalculates derived product fields after direct DB edits) |
| `test` | `vitest run` |

Test dependencies: `vitest`, `supertest`, `mongodb-memory-server`.

---

## 4. Example: Add to Cart, Start to Finish

```
ProductPage
  └─ BuyBox "Add to Cart" click
       └─ useCart().add({ productId, variantId, qty })
            ├─ guest:     dispatch(guestCartSlice.addItem) → localStorage → CartIcon count updates
            └─ signed in: addCartItem mutation → POST /api/cart/items { productId, variantId, qty }
                    server: cart.routes → protect → validate(cart.schema.addItem)
                            → cart.controller.addItem → cart.service.addItem(userId, …)
                                 ├─ Product.findById → variant exists? stock ≥ qty?  (else ApiError 409)
                                 └─ Cart.findOneAndUpdate (upsert, inc qty or push item)
                            → 201 hydrated cart
               client: invalidates 'Cart' → getCart refetch → CartIcon + toast "Added to Cart"
```
