# Coding Standards & Best Practices

These are the rules to follow throughout development. They are specific to this project's stack (React + Vite, Redux Toolkit, Tailwind, Express, MongoDB/Mongoose, JWT, Stripe, Cloudinary). Where a rule depends on a design decision, it links to the doc that makes that decision.

Related docs: [01-initial-plan.md](01-initial-plan.md), [02-project-structure.md](02-project-structure.md), [03-database-schema.md](03-database-schema.md), [04-development-phases.md](04-development-phases.md).

---

## 1. Principles

1. **The server is the source of truth.** Prices, totals, stock, roles, and order status are decided on the server. The client only displays them and sends requests.
2. **Readable over clever.** Code is read far more often than it is written, so choose clear names and simple control flow.
3. **Small units.** Functions do one thing. Components render one idea. Files stay under ~200 lines. If one grows past that, split it.
4. **Fail loudly and early.** Validate inputs at the boundary (Zod), throw typed errors (`ApiError`), and never swallow exceptions.
5. **No duplication of rules.** Business rules live in one place, such as `pricing.service.js` for shipping and tax. The client doesn't repeat them. It displays what the server returns. The client may show hints such as "FREE delivery over $35" using a constant in `utils/constants.js`, but the amounts charged always come from the server.
6. **Leave it better.** If you touch a file and see a small problem, fix it in the same commit. If the fix is large, note it for later.

---

## 2. Git Workflow

- **Branches:** `main` is always runnable. Work on one branch per phase or feature: `phase-03-homepage`, `fix/cart-merge-qty`.
- **Commits:** small, focused, and runnable. Use [Conventional Commits](https://www.conventionalcommits.org):
  ```
  feat(cart): merge guest cart on sign in
  fix(checkout): reject place when quote total changed
  refactor(search): extract filter builder
  test(order): cover reservation expiry
  docs(planning): add payments schema
  chore(deps): bump mongoose to 8.x
  ```
- The commit message explains **why** a change was made when that isn't obvious. Don't explain it in a code comment.
- **Before every commit:** lint passes, tests pass, and you have reviewed your own diff (`git diff --staged`).
- **Never commit:** `.env` files, secrets, `node_modules`, build output, or temporary debugging code (`console.log`, commented-out blocks).
- Merge to `main` only when the phase's "Done when" list in [04-development-phases.md](04-development-phases.md) passes.

---

## 3. JavaScript (client and server)

### 3.1 Tooling

- **ESLint** (flat config) with `eslint:recommended`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` on the client, and `eslint-plugin-n` on the server.
- **Prettier** with `prettier-plugin-tailwindcss`, which sorts Tailwind classes. Settings: 2 spaces, single quotes, no semicolons, trailing commas, 100 columns.
- Format on save. Lint in CI (later) and before commits.

### 3.2 Language rules

- ES modules everywhere (`import`/`export`). The server has `"type": "module"`.
- `const` by default, `let` only when the value is reassigned, never `var`.
- `async`/`await` instead of `.then()` chains. Every promise is either awaited or returned; never leave a promise unhandled.
- Use strict equality (`===`). Use optional chaining (`a?.b`) and nullish coalescing (`??`) instead of `||` when `0` or `''` are valid values.
- **Early returns** instead of nested `if`s:
  ```js
  // Good
  if (!variant) throw new ApiError(404, 'Variant not found')
  if (variant.stock < qty) throw new ApiError(409, 'Not enough stock')
  return addItem(cart, variant, qty)
  ```
- No magic numbers or strings. Named constants go in `utils/constants.js`:
  ```js
  export const MAX_CART_QTY = 30
  export const RESERVATION_MINUTES = 30
  export const FREE_SHIPPING_THRESHOLD_CENTS = 3500
  ```
- Don't mutate function arguments. Return new objects or arrays. (Inside Redux reducers, Immer makes "mutation" safe.)
- Prefer named exports for utilities and services. Use a default export for React components only.

### 3.3 Naming

| Thing | Convention | Example |
|---|---|---|
| Variables, functions | camelCase, verbs for functions | `getHydratedCart`, `isInStock` |
| Booleans | `is`/`has`/`can`/`should` prefix | `isDefault`, `hasIssues` |
| Constants | UPPER_SNAKE_CASE | `MAX_CART_QTY` |
| React components | PascalCase | `BuyBox`, `VariantSelector` |
| Hooks | `use` prefix | `useCart` |
| Money values | `…Cents` suffix, always an integer | `subtotalCents` |
| Dates | `…At` for timestamps, `…Date` for calendar dates | `paidAt`, `estimatedDeliveryDate` |
| Server files | `<resource>.<layer>.js` | `cart.service.js`, `order.routes.js` |
| Collections | plural, camelCase | `stripeEvents` |

Names describe what something is, not how it is stored: `cartItems`, not `arr` or `data2`.

### 3.4 Money and dates

- **Money is integer cents everywhere:** database, API, and Redux. Convert to dollars only for display (`formatCents`), and convert dollars to cents only at admin input (`dollarsToCents`). Never use floats for arithmetic on money.
- Tax rounding happens once, on the total tax (`Math.round`), not per line.
- Dates are stored in UTC and sent as ISO strings. They are formatted in the user's locale only in the UI (`Intl.DateTimeFormat`).

---

## 4. React & Frontend

### 4.1 Components

- Function components and hooks only.
- **Pages compose and components render.** Pages read route params, call query hooks, and arrange components. Components receive data through props or a domain hook.
- `components/ui/` holds generic primitives with **no** imports from Redux, the API, or domain code.
- Keep components small. Extract a subcomponent when JSX passes ~100 lines or when a block has its own state.
- Props: destructure them in the signature, give defaults there, and keep the number of props small. More than ~6 props usually means the component should be split.
- Lists always use stable keys from data (`item._id`), never array indexes.
- Never use `dangerouslySetInnerHTML`. Product text is rendered as plain text.

### 4.2 State: where it belongs

| State | Where |
|---|---|
| Server data (products, cart, checkout, orders) | **RTK Query** only. Never copy it into `useState` or a slice |
| Search, filters, sort, page, selected variant | **URL** (`useSearchParams`) |
| Session user, guest cart, checkout id, sidebar open | **Redux slices** |
| Form inputs, open/closed toggles local to a component | `useState` |
| Values computed from other state | Calculated during render, not stored |

- Avoid `useEffect` for anything that can be calculated during render or handled in an event handler. Use effects only to sync with external systems (Stripe Elements, `document.title`, timers).
- Polling (the confirmation page) uses RTK Query's `pollingInterval`, not a hand-written `setInterval`.
- After a mutation, invalidate tags. Don't refetch manually.

### 4.3 Data fetching (RTK Query)

- One `apiSlice` with `credentials: 'include'`. Each domain adds its endpoints with `injectEndpoints`.
- Every query component handles **4 states**: loading (skeleton), error (message + retry), empty, and success.
- Use optimistic updates only for cheap, reversible actions (qty change, save for later), and undo them on error. Checkout and payment are never optimistic.
- Transform API responses in `transformResponse` only when it's needed for display. The shape stays the same as the server's.

### 4.4 Forms

- Controlled inputs, with a `<label>` linked to each input.
- Validate on blur and on submit, then show the server's field errors too. Client-side validation is for user experience only. The server always validates again.
- Disable the submit button while the request is pending, so a form can't be submitted twice.
- Use the correct input types and `autoComplete` values (`email`, `current-password`, `new-password`, `postal-code`, `tel`, `address-line1`).

### 4.5 Routing

- Route components are lazy loaded (except Home and Search). Each route has an `errorElement`.
- Protected and admin routes are enforced in the UI **and** on the server. The UI check only improves the experience; the server check is what keeps data safe.
- Only follow `redirect` query params if they are relative internal paths. This prevents open redirects:
  ```js
  const safe = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
  ```

---

## 5. Styling (Tailwind) & Accessibility

### 5.1 Tailwind

- Use the theme tokens in `index.css` (`bg-nav`, `text-price`, `bg-btn-yellow`). Don't hard-code hex values in class names.
- Avoid arbitrary values (`w-[317px]`) unless you're matching an exact Amazon measurement. If you use the same arbitrary value twice, make it a token.
- When a long class list is repeated, wrap it in a component (`<Button variant="yellow">`), not `@apply`.
- Build mobile-first with breakpoints (`sm:`, `md:`, `lg:`). Test at 375, 768, 1024, and 1440 px.
- Product images keep their aspect ratio (`aspect-square object-contain`) and always go through `utils/cloudinary.js`.

### 5.2 Accessibility (required, not optional)

- **Semantic HTML first:**
  - `<button>` for actions and `<a>`/`<Link>` for navigation
  - `<nav>`, `<main>`, `<header>`, `<footer>`
  - one `<h1>` per page, with headings in order
- Every interactive element works with the keyboard. Focus is always visible (`focus-visible:ring`).
- Modals and drawers:
  - keep focus inside while open
  - close on Esc
  - return focus to whatever opened them
  - set `aria-modal` and a label
- Images:
  - product images have meaningful `alt` text (the product title, or the admin-entered alt text)
  - decorative images have `alt=""`
- Icon-only buttons have an `aria-label` ("Open menu", "Remove item").
- Don't use color alone to convey meaning. "Only 3 left in stock" is text, not just red. Contrast must be at least 4.5:1.
- Dynamic messages (toasts, cart updates, form errors) use `role="status"` or `aria-live="polite"`.
- Use ARIA only when there is no suitable native element.

---

## 6. Backend (Express)

### 6.1 Layering (see [02-project-structure.md §3.2](02-project-structure.md#32-layers))

- **Routes:** method + path + middleware + controller. No logic.
- **Controllers:** read `req`, call services, send the response. No Mongoose queries.
- **Services:** all business logic. No `req`/`res`. They are pure enough to unit test.
- **Models:** schema, indexes, hooks, small helpers.

```js
// routes/cart.routes.js
router.post('/items', protect, validate({ body: addItemSchema }), asyncHandler(cartController.addItem))

// controllers/cart.controller.js
export async function addItem(req, res) {
  const cart = await cartService.addItem(req.user._id, req.body)
  res.status(201).json(cart)
}
```

### 6.2 API design

- Resource-oriented URLs, plural nouns: `/products`, `/orders/:orderNumber`.
- Verbs only for actions that don't fit CRUD: `/checkout/:id/place`, `/orders/:orderNumber/cancel`.
- Status codes:

  | Code | Meaning |
  |---|---|
  | 200 | Read or update succeeded |
  | 201 | Created |
  | 204 | Deleted (no body) |
  | 400 | Validation error |
  | 401 | Not signed in |
  | 403 | Signed in but not allowed |
  | 404 | Not found, or not yours |
  | 409 | Conflict: stock, duplicate, price changed |
  | 422 | Rule violation, e.g. publishing a product without images |
  | 429 | Rate limited |
  | 500 | Unexpected error |

- A request for someone else's resource returns **404, not 403**, so the response doesn't reveal that the resource exists.
- Error body: `{ message, code?, details? }`. `code` is a stable machine-readable string (`out_of_stock`, `price_changed`) that the client can switch on.
- Every list endpoint is paginated, with a maximum `limit` (48 for shoppers, 100 for admins). Never return an unbounded list.
- Responses contain only what the client needs. Use projections, and never include `passwordHash`, internal flags, or other users' data.

### 6.3 Validation

- Every `body`, `query`, and `params` is validated with Zod in `validate()` before it reaches a controller.
- Schemas are **strict** (`.strict()`), so unknown keys are rejected. This prevents mass assignment, such as a client setting `role`, `department`, `salesCount`, or `priceCents` on a cart item.
- Convert and limit query params: `page: z.coerce.number().int().min(1).default(1)`.
- ObjectIds are validated with a shared `objectId` Zod helper before they reach Mongoose.

### 6.4 Async and errors

- Every controller is wrapped in `asyncHandler`. There are no `try/catch` blocks in controllers just to forward errors.
- Expected failures are thrown as `ApiError(status, message, { code, details })`.
- `errorHandler` converts Zod errors, Mongoose validation and cast errors, duplicate keys (`E11000` → 409), and JWT errors into the standard response. It hides the stack trace in production.

---

## 7. MongoDB & Mongoose

- **Schemas are strict** (the default) and have `timestamps: true`. Every field has a type, plus `required`, `min`/`max`, `enum`, or `match` where they apply.
- Turn on `mongoose.set('sanitizeFilter', true)` and `mongoose.set('strictQuery', true)`. Together with Zod, these block NoSQL injection (`{ "$gt": "" }` in a filter).
- **Every query has a supporting index.** When you add a query, check the index list in [03-database-schema.md §6](03-database-schema.md#6-indexes). Use `.explain()` if you're unsure.
- **Reads that only display data** use `.lean()` and a projection:
  ```js
  Product.find(filter).select('title slug images minPriceCents ratingAvg ratingCount').lean()
  ```
- **Writes that need hooks** (products, categories) use `findById` → change → `save()`. Hooks don't run on `updateOne`, so don't use it for those models (stock `$inc` is the one exception, followed by `syncStockFields`).
- **Concurrency-sensitive updates are atomic and conditional.** Don't read, change in memory, and write back:
  ```js
  // Good: atomic, only succeeds if stock is enough
  Product.updateOne(
    { _id, variants: { $elemMatch: { _id: variantId, stock: { $gte: qty } } } },
    { $inc: { 'variants.$.stock': -qty } },
    { session },
  )
  ```
- **Multi-document changes use transactions** (`session.withTransaction`): placing an order, cancelling, applying webhooks, moving a category.
- **No N+1 queries.** Load related documents with a single `$in` query or `populate` with `select`, never inside a loop.
- Arrays in documents must have a size limit (variants ≤ 20, cart items ≤ 50, addresses ≤ 10). Anything that can grow without limit gets its own collection.
- Never delete data that other documents refer to. Archive or deactivate it instead (products, ordered variants, categories in use).
- `autoIndex: false` in production. Indexes are created by `syncIndexes()` during seeding or deployment.

---

## 8. Security Checklist

Go through this list at the end of every phase that touches the area, and fully in Phase 13.

**Authentication & sessions**
- [ ] Passwords hashed with bcrypt (cost 12). `passwordHash` is `select: false`.
- [ ] JWT in an `httpOnly`, `sameSite=lax` cookie, `secure` in production. Never in localStorage or response bodies.
- [ ] `JWT_SECRET` has at least 32 random bytes. The token holds only `{ sub }`, and the user is loaded on each request.
- [ ] Sign-in and sign-up are rate limited. Error messages don't reveal whether an email is registered.

**Authorization**
- [ ] Every query for user-owned data includes `user: req.user._id` (cart, checkout, orders, payments, addresses).
- [ ] Every `/api/admin/*` route is behind `protect` + `requireAdmin`.
- [ ] Clients can't set roles, prices, totals, statuses, or derived fields. Strict Zod schemas reject them.

**Input & output**
- [ ] Zod validation on every input. `sanitizeFilter` is on.
- [ ] React escapes all output, and `dangerouslySetInnerHTML` is never used.
- [ ] Uploads: images only (`image/jpeg|png|webp`), max 5 MB, admin only, stored in Cloudinary (never on local disk).
- [ ] `redirect` params are restricted to internal paths.

**Transport & headers**
- [ ] `helmet()` is on. In production, a CSP allows only `self`, `js.stripe.com`, and `res.cloudinary.com`.
- [ ] CORS allows only `CLIENT_URL` with credentials. In production the app is served from a single origin.
- [ ] Mutating endpoints only accept `application/json` (or multipart for uploads). Combined with `sameSite=lax`, this protects against CSRF.
- [ ] `express.json({ limit: '100kb' })`.

**Secrets & dependencies**
- [ ] All secrets are in `.env`, validated by `config/env.js`, and never sent to the client. Only `VITE_*` variables reach the browser, and they hold only publishable keys.
- [ ] `npm audit` has no high or critical issues before a release.

---

## 9. Payments (Stripe)

These rules apply to the design in [03-database-schema.md §7.5](03-database-schema.md#75-checkout-and-stripe-payment).

- **The amount is always calculated on the server.** The PaymentIntent `amount` is the order's `totalCents` and nothing else.
- **Only webhooks mark an order paid.** The client's `confirmCardPayment` result is used for the UI only, never to change data.
- **Verify every webhook** with `stripe.webhooks.constructEvent` on the **raw** body. Reject anything that doesn't verify.
- **Every webhook handler must be safe to run twice.** Record each event in `stripeEvents` with a unique id, and only apply state transitions from the expected status.
- **Use idempotency keys** on every Stripe write call (`pi-<orderId>`, `refund-<orderId>`).
- **Check before marking paid:** `amount_received` and `currency` must match the order.
- **Never store or log** card data or the `client_secret`. Card details only ever go through Stripe Elements.
- Use test mode keys (`sk_test_`, `pk_test_`) everywhere. If `livemode: true` ever appears in an event, it is logged and ignored.

---

## 10. Error Handling & Logging

- **Server:**
  - `morgan` logs requests.
  - Application logs use a small `logger` (`info`/`warn`/`error`) that includes the request id.
  - Log context such as `orderNumber`, `userId`, and `eventId`, never secrets or personal data such as passwords, tokens, or full addresses.
- Remove `console.log` debugging before committing (ESLint `no-console` with `warn`/`error` allowed on the server).
- **Client:**
  - Show users friendly messages ("Something went wrong. Try again.").
  - In development, show detailed errors.
  - Each route's `errorElement` catches rendering errors.
- Handle failures where they happen. Unexpected errors propagate up to the error handler, and are never silently caught.

---

## 11. Performance

- **Images:**
  - Cloudinary `f_auto,q_auto` with a width that matches where the image is shown
  - `loading="lazy"` for images below the fold, `fetchpriority="high"` for the hero and the main product image
  - explicit `width`/`height` so the layout doesn't shift
- **Bundles:**
  - lazy routes
  - admin pages in their own chunk
  - Stripe.js loaded only on checkout (`loadStripe` called there)
- **Lists:** paginate on the server. Never fetch the whole catalog to the client.
- **Caching:**
  - `Cache-Control: public, max-age=300` on category and home responses
  - RTK Query `keepUnusedDataFor` for catalog data
- Debounce search-as-you-type inputs (300 ms) if they're added.
- Measure before optimizing. Use `React.memo`/`useMemo` only when profiling shows a problem.

---

## 12. Testing

| Level | Tool | What to test |
|---|---|---|
| Unit | Vitest | Pure logic: `pricing.service`, `search.service` filter builder, seed transforms, `money`/`dates` utils |
| API integration | Vitest + supertest + `MongoMemoryReplSet` | Every endpoint's success path plus its main failure paths (validation, auth, ownership, conflicts) |
| Payment | Same, with Stripe mocked | Webhook signature, processing an event only once, amount check, expiry, refund |
| Component | Vitest + Testing Library | Complex UI logic only: `VariantSelector`, `useCart`, `FilterSidebar` URL sync |
| End-to-end | Playwright | Core flow + guest cart merge + admin create-and-publish |

- Tests follow **Arrange → Act → Assert**, and their names describe behavior: `it('caps quantity at available stock when merging')`.
- Each test creates its own data with helpers (`createUser`, `createProduct`). Tests never depend on the seed or on each other.
- When fixing a bug, write a test that reproduces it first.
- Aim for high coverage on services: pricing, checkout, order, webhook, and cart must have their branches covered. Don't chase a coverage percentage on UI code.

---

## 13. Configuration & Environments

- All config comes from environment variables, read **only** in `config/env.js` and validated with Zod. The server refuses to start if a variable is missing or invalid.
- `.env.example` lists every variable with a placeholder. Update it in the same commit that adds a variable.
- Behavior that differs between environments checks `env.NODE_ENV`. Examples: the stack trace in errors, `seed --reset` being blocked in production, and the reservation time set to 1 minute in development.

---

## 14. Comments & Documentation

- Write code that explains itself first. Comments are **rare and short**, and they explain *why*, never *what*:
  ```js
  // Stripe may deliver events out of order; only advance from the expected status.
  ```
- Don't leave commented-out code, comments that describe changes ("added this to fix…"), or TODOs without a phase or issue reference.
- Add JSDoc only to shared utilities with tricky parameters (`imageUrl(url, opts)`).
- **Keep the planning docs up to date.** When a decision changes (a schema field, an endpoint, a rule), update the matching doc in the same branch. The docs and the code must not disagree.
- The README always has working setup steps, the scripts, test cards, and the demo logins.

---

## 15. Pre-Merge Checklist

Copy this list into each phase's final review:

- [ ] Every item in the phase's "Done when" list passes when checked by hand.
- [ ] `npm run lint` and `npm test` pass for client and server.
- [ ] Each new screen has loading, empty, and error states.
- [ ] It works with the keyboard alone and at 375px width.
- [ ] No `console.log`, commented-out code, or unused files/exports.
- [ ] New inputs have Zod validation. New queries have an index and filter by owner where needed.
- [ ] No secrets in the diff. `.env.example` is updated if needed.
- [ ] Money stays in integer cents throughout the change.
- [ ] Planning docs are updated if a decision changed.
- [ ] Commit messages follow Conventional Commits.
