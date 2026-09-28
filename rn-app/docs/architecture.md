# E-commerce App Architecture (React Native Q5)

The question asks for an architecture covering authentication, product catalog, cart, checkout,
payments and notifications, and for an explanation of why it was chosen and how it scales to a
million users. This document is the answer. To make it less abstract, I also built the client side as
a small working store (`src/features/shop`), backed by a few storefront endpoints in the mock backend
(`mock-backend/src/http/routes/shop.routes.ts`). Open **E-commerce Store** in the app, add something
to the cart and check out as the demo employee. There are test cards for an approved payment, a
decline and insufficient funds.

## Why this architecture

A million users is big enough that the design has to scale, but small enough that a giant
microservice estate would slow the team down more than it helps. So rather than start from a
technology list, I started from a few decisions about how the system should behave, and let the
structure follow from those.

**Services owned by teams, talking only through APIs.** I want each team to be able to ship without
coordinating with the others, and to run what it builds. On the backend I split things by domain:
identity, catalogue, cart, pricing, orders, payments and notifications, each owning its own data. The
app mirrors that. Every domain is a feature module with a single public `index.ts`, so the team that
owns the order service can also own `features/shop/orders` without stepping on anyone.

**The cart is always writeable.** Refusing an "add to cart" loses a sale, while a cart that is a few
seconds stale costs nothing, so availability matters more than consistency here. In the app the cart
lives on the device. Adding an item always succeeds instantly, even offline, and the cart survives
restarts. The flip side is that nothing in it is trusted. Prices and stock are always re-checked by
the server when the cart is quoted.

**Strict consistency where money is involved.** The server calculates every total. The client never
sends an amount; the payment intent is created for the server's figure, and the order service
re-prices the cart and checks it against the payment before accepting the order.

**Retries that don't make things worse.** Every request has a timeout, and only reads are retried
automatically, with randomised exponential back-off so that thousands of phones don't all retry at
the same moment after an outage. Writes are only retried when repeating them is safe. Placing an
order carries an `Idempotency-Key` generated once per checkout, so sending it twice returns the same
order instead of creating a second one.

**Optional parts of a page are allowed to fail.** A product page draws on several services, and a
slow recommendations service shouldn't break "Add to cart". In the store, the "More in this
category" row and the category chips simply disappear if their request fails. Each screen
also has its own error boundary, so a crash in one screen doesn't take the app down.

**Events instead of direct calls.** When an order is placed, the order service publishes an
`OrderPlaced` event, and the notification, email, inventory and analytics services each pick it up.
Checkout stays fast, and each consumer can scale or fail on its own. The app follows the same idea on
a small scale: checkout dispatches `orderPlaced`, and the cart clears itself in response.

What I deliberately left out is the machinery that only pays off at a much larger size: hundreds of
services, cell-based deployments, multi-region active-active. Seven services with the right
boundaries is plenty for a million users, and because the boundaries are right, any one of them can
be split later without touching the app.

## The system

```
 React Native app
        │
        ▼
 CDN (CloudFront) ── images in several sizes, cacheable catalogue responses
        │
        ▼
 API gateway / BFF ── JWT auth, rate limits, request IDs, one call per screen
        │
        ├── Identity           OIDC, refresh tokens
        ├── Catalogue          OpenSearch for search, Redis for hot products
        ├── Cart               DynamoDB, keyed by customer
        ├── Pricing            tax, shipping, promotions
        ├── Checkout / Order   Aurora Postgres
        ├── Payment            provider SDK + webhooks
        └── Notification       FCM / APNs push, WebSocket while the app is open
                 ▲
                 └── event bus (SNS/SQS or EventBridge): OrderPlaced, PaymentCaptured, ...
                     also consumed by inventory, email and analytics
```

The app only ever talks to the gateway. That one rule is what lets the backend change shape without
an app release. Each service picks the store that suits its access pattern: carts are simple lookups
by customer, orders need transactions, and the catalogue is mostly search and cached reads.

Card details never touch our code or servers. The payment provider's SDK collects them, which keeps
us in the lightest PCI DSS scope (SAQ-A). The payment result is confirmed by the provider's webhook,
never only by the app's callback.

## The mobile app

### Folder structure

```
src/
├── app/                   Expo Router routes; thin files that render feature screens
├── core/                  shared infrastructure with no business logic
│   ├── api/               HTTP client, RTK Query base query, retry, error messages
│   ├── notifications/     local notifications and deep links
│   ├── store/             Redux store, typed hooks, listener middleware
│   └── ui/                design system, error boundary, keyboard handling
└── features/
    ├── auth/              session, secure token storage, sign-in screen
    └── shop/
        ├── index.ts       the only thing routes and the store import
        ├── api/           endpoints and contracts
        ├── catalog/       product list, search, product page
        ├── cart/          cart state, persistence, cart screen
        ├── checkout/      state machine, checkout session, screens
        ├── payments/      PaymentGateway interface and the provider adapter
        ├── orders/        order history and detail
        └── notifications/ order events
```

The rules are simple. `core` never imports from `features`, and one feature only imports another
through its `index.ts`. With several teams I'd enforce that with `eslint-plugin-boundaries` and give
each folder an owner in `CODEOWNERS`. I chose feature folders over the usual
`components/screens/reducers` split because that split is fine at ten screens and painful at a
hundred: every change touches every folder.

### API layer

Screens never call `fetch`. They use RTK Query hooks, which go through a shared base query, which
uses one HTTP client:

```
screen → RTK Query hook → base query (retries reads) → HTTP client (timeout, token, ApiError) → gateway
```

RTK Query handles caching and de-duplication. Catalogue data is cached for ten minutes, quotes are
never cached, and orders refresh when an order event arrives. Every failure comes back as a single
`ApiError` type with an `isTransient` flag, which is what decides whether a retry makes sense. In a
real project I'd generate the request and response types from the backend's OpenAPI spec, so an API
change breaks the build instead of the app.

### State

I split state by where it comes from:

- **Server data** (products, quotes, orders) lives in the RTK Query cache. It's never copied into
  Redux slices, so there's only one version of it.
- **The cart** is a Redux slice, persisted to device storage, because the device owns it.
- **The session** is in Redux, with the tokens themselves in SecureStore (Keychain / Keystore).
- **Checkout** is a state machine: address → shipping → payment → confirming → done or failed. Any
  event that isn't valid for the current step is ignored, which quietly handles things like a double
  tap on "Pay". It's a pure function, so it has proper unit tests.
- **Everything else** (form fields, the selected card) stays in component state.

### When things go wrong

Most of the error handling is about not lying to the user and not charging them twice.

If a read fails because the phone is offline, cached data stays on screen with an offline banner, and
the request retries in the background before offering a "Retry" button. If an item goes out of stock
or its price changes, the quote comes back with a specific message and checkout stays disabled until
the cart is fixed. A declined card takes you back to the payment step with the provider's reason, and
the same payment intent is reused for the next attempt.

The case I was most careful with is a timeout after the payment has gone through. The client doesn't
assume failure. It asks the server whether an order exists for that idempotency key. Only if there's
no order does it show an error, and even then it tells the user that retrying won't charge them
again, because the retry reuses both the key and the authorised payment.

All of this goes through one function (`describeError`) that turns errors into user-facing text, so
the same problem is always described the same way. In production I'd add Sentry, with Redux
breadcrumbs scrubbed of personal data, and use its crash-free rate to gate staged rollouts.

## Notes on each module

**Authentication.** OIDC with PKCE: a short-lived access token and a rotating refresh token kept in
SecureStore. When a request gets a 401, a single refresh runs while other requests wait for it.
Browsing and the cart work signed out, and checkout asks you to sign in without losing the cart.

**Product catalog.** A cursor-paginated search API with virtualised lists and memoised rows (the same
techniques as the 50,000-product question). Images come from a CDN in the size the screen needs,
through `expo-image` with a disk cache.

**Cart.** Stored on the device and always writeable. Once a user signs in, the device cart should
merge into their server cart: take the union of items, add up quantities and cap at stock. The demo
keeps the cart on the device only, and I've left server-side merging out of it.

**Checkout.** The server works out tax, shipping and promotions; the app displays whatever it's given
and follows the state machine.

**Payments.** Three steps. The server creates a payment intent for the amount it calculated. The
provider's SDK confirms it (Stripe or Razorpay, with Apple Pay and Google Pay). Then the order is
placed under the idempotency key. The app talks to the provider through a small `PaymentGateway`
interface, so switching providers only touches `payments/`.

**Notifications.** The order service publishes events. While the app is open they arrive over a
WebSocket, refresh the order data and show a local notification. When the app is closed the same
events go out as FCM / APNs push. Every notification carries an in-app link, so tapping it opens the
order.

## Checkout, step by step

```
App                          Our services                                Payment provider
 │ POST /shop/quote ───────► Pricing: check stock, work out totals
 │ ◄─────────────────────── quote
 │ POST /shop/payment-intents ► Payment: intent for the server's total ──► create intent
 │ confirm(intent, card) ──────────────────────────────────────────────► authorise
 │ ◄────────────────────────────────────────────────────────── succeeded / declined
 │ POST /shop/orders (Idempotency-Key) ► Order: re-price, check payment, create order
 │ ◄─────────────────────── order                    │
 │                                                    └─► event bus: OrderPlaced
 │ ◄── WebSocket / push "Order confirmed" ◄── Notification
```

## Scaling to a million users

First, some rough numbers. A million monthly users usually means somewhere between 100k and 200k
people on a given day. If each of them makes around 50 API calls, that's roughly 100 requests a
second on average and maybe 1,000 at the evening peak. A big sale can push that to around 10,000 a
second for a few hours. At a 2–3% conversion rate, orders only reach a few per second even at peak.

The important observation is that about 90% of that traffic is people browsing the catalogue, and
catalogue reads are easy to cache. So the problem is mostly serving reads cheaply, plus making sure
checkout survives a sale-day spike.

**Start with the app itself.** The cheapest request is the one never made. The catalogue is cached
with TTLs and ETags, lists are paginated, search is debounced and superseded requests are cancelled.
Images are requested at the size the screen needs, which is the single biggest bandwidth saving.
Retries and WebSocket reconnects use jittered back-off, so when the backend restarts, a million
phones don't reconnect in the same second. Remote feature flags let us switch off expensive features
like recommendations during a spike, and EAS Update lets us ship JavaScript fixes over the air with a
staged rollout (1% → 10% → 100%).

**Then the edge.** The CDN serves images and most catalogue responses, so the majority of reads
never reach our servers. The gateway rate-limits per user and per device, and when a client goes over
the limit it gets a 429 straight away rather than a slow timeout.

**The services** are stateless and scale horizontally behind load balancers (ECS or EKS, autoscaling
on CPU and request count). Because they're separate, they scale separately: the catalogue grows with
browsing traffic, while orders and payments only need to scale for sale days. Every call to another
service has a timeout and a circuit breaker, especially calls to the payment provider. Critical and
optional traffic are kept apart, so a struggling recommendations service can't slow down checkout.

**Data.** The catalogue lives in OpenSearch, with Redis in front for hot products. Carts go in
DynamoDB keyed by customer, which gives single-digit-millisecond reads and writes at any volume and
fits the always-writeable model. Orders go in Aurora Postgres with read replicas for reporting, and
can be partitioned by date once the table gets large. Sessions and rate-limit counters live in Redis.

**Anything that doesn't need to happen during checkout goes through a queue**: confirmation emails,
push fan-out, inventory updates and analytics. On a sale day that turns a spike into a backlog that
drains over a few minutes, rather than an outage. Queues deliver at least once, so every consumer is
idempotent.

**Operations.** Each request carries an ID from the app through every service, so one slow checkout
can be traced end to end. Each endpoint gets rate, error and duration metrics, with SLOs such as
99.9% checkout availability and p95 latency under 300 ms. I'd run a load test before every major
sale, and everything runs across multiple availability zones.

**Past a million users**, the next step would be a cell-based architecture: several identical
copies of the stack, each serving a slice of customers, so a bad deployment affects one cell rather
than everyone. Shuffle-sharding narrows that further, and multi-region comes after that. None of it
is needed yet, but the service boundaries and idempotent APIs above are what make it possible later.

## Quality and delivery

TypeScript in strict mode, ESLint with the module-boundary rules, and Prettier. Pure logic such as
the checkout state machine, the OTP input and the sync engines gets unit tests. Components get React
Native Testing Library tests, and the main purchase flow (sign in, add to cart, check out) gets a
Maestro or Detox end-to-end test on every pull request. CI runs typecheck, lint and unit tests, then
builds an EAS preview, runs the end-to-end tests and publishes to a preview update channel. Tagging a
release promotes the build to the stores. For accessibility, every control has a label and role,
touch targets are at least 44 pt, text respects dynamic type, and QA includes screen-reader checks.

## Where to find things in the code

| What | Where |
| --- | --- |
| The shop feature's public API | `src/features/shop/index.ts` |
| HTTP client and `ApiError` | `src/core/api/http-client.ts` |
| Retries with jittered back-off | `src/core/api/retry.ts`, `src/core/api/base-query.ts` |
| User-facing error messages | `src/core/api/error-message.ts` |
| Endpoints and caching | `src/features/shop/api/shop-api.ts` |
| Persisted, always-writeable cart | `src/features/shop/cart/state/`, `src/core/store/listener-middleware.ts` |
| Checkout state machine and its tests | `src/features/shop/checkout/state/checkout-machine.ts`, `__tests__/` |
| Idempotent order placement | `src/features/shop/checkout/state/checkout-session.ts` |
| Payment provider interface | `src/features/shop/payments/payment-gateway.ts` |
| Order events and deep links | `src/features/shop/notifications/`, `src/core/notifications/` |
| A section that hides itself on failure | `RelatedProducts` in `src/features/shop/catalog/screens/product-screen.tsx` |
| Per-screen error boundary | `src/core/ui/route-error.tsx` |
| Server side: pricing, mock payments, orders | `mock-backend/src/http/routes/shop.routes.ts` |

