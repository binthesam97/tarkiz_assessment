# E-commerce App Architecture (React Native Q5)

Modules: **Authentication · Product Catalog · Cart · Checkout · Payments · Notifications**

The answer has two parts:

1. **This design**: the architecture, why it was chosen, and how it scales to one million users.
2. **A working reference store** that implements the client side of it, in `src/features/shop`, backed
   by the storefront endpoints in `mock-backend/src/http/routes/shop.routes.ts`. In the app, open
   **E-commerce Store**, add something to the cart and check out as the demo
   employee. The test cards cover approval, a decline and insufficient funds.

---

## 1. Modelled on how Amazon builds commerce

Amazon has published a good deal about how its retail platform is built. The design borrows the
principles that matter at this scale and deliberately leaves out the machinery that only pays off at
Amazon's scale.

| Amazon practice | What it solves | Where it shows up here |
| --- | --- | --- |
| **Services owned by small teams, reachable only through APIs.** "You build it, you run it" (Werner Vogels, ACM Queue, 2006). | Teams ship independently; one area's change cannot break another's internals. | Backend: one service per domain (catalogue, cart, pricing, order, payment, notification), each owning its data. App: one **feature module per domain**, with a public `index.ts`, so ownership lines up with a service and a team. |
| **The shopping cart is "always writeable"** (the Dynamo paper, SOSP 2007). Rejecting "add to cart" loses a sale; a briefly stale cart does not. | Availability where it earns money. | The cart is owned by the device: adding always succeeds instantly, even offline, and it is persisted. The server re-prices it; client prices are never trusted. |
| **Strong consistency where money moves.** | No overcharging, no double charging. | The server calculates every total. The payment amount comes from the server, and the order service checks it against a fresh quote before accepting the order. |
| **Timeouts, retries and back-off with jitter** (Builders' Library). | Transient faults are common; synchronised retries turn a blip into an outage. | One HTTP client with timeouts. Reads retry transient failures (network, 429, 5xx) with *full-jitter* exponential back-off (`core/api/retry.ts`, `core/api/base-query.ts`). |
| **Making retries safe with idempotent APIs** (Builders' Library). | A retried "place order" must not create two orders. | Each checkout carries one `Idempotency-Key`. A replay returns the original order. After a timeout the client asks the server by key before reporting failure. A retry reuses the already-authorised payment (`checkout-session.ts`). |
| **Pages composed from many independent services.** | One slow widget should not break the page. | Critical paths (price, add to cart, pay) are separate from optional ones. "More in this category" and the category chips simply hide if their request fails. A per-route error boundary contains crashes. |
| **Load shedding and throttling** (Builders' Library). | Under overload, reject early rather than time out slowly. | The client treats 429 like any other transient error: it backs off, then retries. Rate limits sit at the gateway. |
| **Event-driven work behind the order.** | Checkout stays fast; downstream work scales on its own. | The order service publishes `OrderPlaced`, and notification, email, inventory and analytics consume it. In the app, checkout emits `orderPlaced` and the cart clears itself: modules react to events instead of calling each other. |
| **Cells and shuffle-sharding** (AWS whitepaper and Builders' Library). | Limit how many customers a single failure can affect. | Not needed at one million users. It is the next step at 10× (see §6). |

**Why not copy Amazon exactly?** Amazon runs very many services for hundreds of millions of customers.
At one million users that overhead would slow the team down. The design keeps Amazon's *boundaries*
and *failure-handling rules*, with **six services instead of hundreds**. Because the boundaries are
already right, any one service can later be split further without touching the app.

## 2. System overview

```
                       ┌──────────────────────── CDN (CloudFront) ───────────────────────┐
  React Native app ───►│ images in several sizes · cacheable catalogue responses (short TTL) │
   (iOS / Android)     └────────────────────────────────┬─────────────────────────────────┘
                                                        ▼
                         API gateway / BFF — auth (JWT), rate limits, request IDs,
                         one aggregated call per screen
        ┌─────────────┬──────────────┬──────────────┬───────────────┬───────────────┐
        ▼             ▼              ▼              ▼               ▼               ▼
    Identity      Catalogue        Cart          Pricing       Checkout /       Payment
   (OIDC, MFA)  + search index  (DynamoDB,     (tax, promos,    Order          (provider
                (OpenSearch)    per customer)   shipping)     (Aurora/Postgres) adapter +
                + Redis cache                                        │          webhooks)
                                                                     ▼
                              Event bus (SNS/SQS or EventBridge): OrderPlaced, PaymentCaptured…
                                         │              │              │
                                         ▼              ▼              ▼
                                   Notification      Inventory      Email / analytics
                                   (FCM / APNs,
                                    WebSocket)
```

- **The app only ever talks to the gateway.** Services can be split, merged or moved without an app
  release.
- **Each service owns its data store**, chosen for its access pattern:
  - **Cart:** a key-value store keyed by customer.
  - **Orders:** relational, needing transactions.
  - **Catalogue:** a search index plus a cache.
- **The payment provider holds card data**, which keeps us in the lightest PCI DSS scope (SAQ-A).
  Payment results are confirmed by provider webhooks, never only by the app's callback.

## 3. Mobile app architecture

### Layers and folders

```
src/
├── app/                          # Expo Router routes only: thin files that render feature screens
│   └── shop/                     # catalogue, product/[id], cart, checkout (modal), orders
├── core/                         # infrastructure with no business logic
│   ├── api/                      # http-client (timeouts, typed ApiError), base-query (RTK Query adapter),
│   │                             # retry (jittered back-off), error-message (one copy for every failure)
│   ├── notifications/            # local notifications, deep links from notification taps
│   ├── store/                    # store, typed hooks, listener middleware (cross-module effects)
│   ├── network/  db/  hooks/     # connectivity, SQLite, shared hooks
│   └── ui/                       # design system and the per-route error boundary
└── features/
    ├── auth/                     # session, secure token storage, shared sign-in screen
    └── shop/
        ├── index.ts              # the only import surface for routes and the store
        ├── shop-events.ts        # domain events shared by the modules (orderPlaced)
        ├── api/                  # RTK Query endpoints + contracts
        ├── catalog/              # list, search, categories, product page
        ├── cart/                 # slice, selectors, persistence, cart screen
        ├── checkout/             # state machine, checkout session, screens
        ├── payments/             # PaymentGateway interface + provider adapter
        ├── orders/               # order history and detail
        └── notifications/        # order events → cache refresh + local notification
```

**Rules**

- `core` never imports from `features`.
- Features import other modules only through their `index.ts`. At team scale this is enforced with
  `eslint-plugin-boundaries`, and `CODEOWNERS` gives each folder an owning team.
- Modules coordinate through **events**, not direct calls. Checkout dispatches `orderPlaced`; the cart
  and order history react to it.

### API layer

```
Screen ─► RTK Query hook ─► baseQuery (retry reads with jitter) ─► httpClient ─► API gateway
              │                                                        │
              └─ cache: TTL per endpoint, tags, refetch on reconnect  └─ timeout · bearer token · ApiError
```

- **Caching:**
  - the catalogue is cached for 10 minutes;
  - quotes are never cached;
  - orders are refreshed through tags and by order events.
- **Retries:** reads are retried automatically. Writes are **never** retried blindly. The one write
  path that must survive failures (placing an order) retries explicitly, under an idempotency key.
- **Contracts:** in production the types are generated from the backend's OpenAPI spec, so an API
  change breaks the build rather than the app.

### State management

| Kind of state | Where it lives | Example |
| --- | --- | --- |
| Server state | RTK Query cache | products, quotes, orders |
| Client domain state | Redux slice, persisted | cart |
| Session | Redux + SecureStore (Keychain / Keystore) | tokens, user |
| Flow state | Explicit state machine | checkout steps |
| Ephemeral UI | Component state | form fields, selected card |

- **Checkout is a state machine:** `address → shipping → payment → confirming → done | failed`. Illegal
  transitions are ignored, so a second tap on "Pay" or a back gesture mid-payment does nothing. It is
  a pure function with unit tests (`checkout/state/__tests__`).
- **Selectors are memoised** (`createSelector`), and components select the smallest slice they need.

### Error handling

| Failure | Behaviour |
| --- | --- |
| Offline / timeout on a read | Cached data is shown with an offline banner. The request retries with back-off, then offers "Retry". |
| Out of stock or price changed | The server quote rejects the cart with a specific message, and checkout is disabled until the cart is fixed. |
| Card declined | Checkout returns to the payment step with the provider's reason. The same payment intent is reused. |
| Timeout **after** payment | The client looks the order up by idempotency key. It only reports failure when the order does not exist, and says a retry will not charge twice. |
| Crash in one screen | The route's error boundary shows "Try again"; the rest of the app keeps working. |
| Everything else | One mapping (`describeError`) turns the error into consistent user-facing text. |

In production, Sentry receives crashes and errors, with Redux breadcrumbs scrubbed of personal data.
Its release-health figures gate staged rollouts.

## 4. Module notes

- **Authentication:** OIDC with PKCE, a short-lived access token and a rotating refresh token in
  SecureStore. A single in-flight refresh handles 401s. Browsing and the cart work signed out; checkout
  and orders ask for sign-in and keep the cart.
- **Product Catalog:**
  - a search index behind a cursor-paginated API;
  - virtualised lists with memoised rows, as in the 50,000-product challenge;
  - images from a CDN in several sizes (`expo-image` with a disk cache).
- **Cart:** adding is instant and works offline; the cart is persisted on the device. On sign-in the
  device cart merges into the server cart the way Dynamo reconciles carts: take the union, sum the
  quantities, cap at stock.
- **Checkout:** the server calculates totals (tax, shipping, promotions). The client only renders them
  and follows the state machine above.
- **Payments:** the checkout session flow is:
  1. The server creates a payment intent for the amount it calculated.
  2. The provider's SDK (Stripe or Razorpay, with Apple Pay / Google Pay) confirms it. Card data never
     touches our code.
  3. The order is placed under an idempotency key.

  `PaymentGateway` is the seam, so changing providers only touches `payments/`.
- **Notifications:**
  - The order service publishes events.
  - While the app is open they arrive over a WebSocket, refresh the order cache and show a local
    notification.
  - When the app is closed the same events are delivered as FCM / APNs push.
  - Each notification carries an in-app `link` that opens the order when tapped.

## 5. Checkout, step by step

```
App                         Gateway / services                       Payment provider
 │ POST /shop/quote ─────────► Pricing: validate stock, compute totals
 │ ◄──────────────────────── quote (total)
 │ POST /shop/payment-intents► Payment: intent for the SERVER's total ─► create intent
 │ confirm(intent, method) ────────────────────────────────────────────► authorise
 │ ◄───────────────────────────────────────────────────────────────── SUCCEEDED | DECLINED
 │ POST /shop/orders  (Idempotency-Key) ► Order: re-price, verify intent, create order
 │ ◄──────────────────────── order                       │
 │                                                        └─► event bus: OrderPlaced
 │ ◄─ WebSocket / push "Order confirmed" ◄── Notification ◄──┘
```

## 6. Scaling to 1 million users

### Sizing

| Metric | Estimate | Reasoning |
| --- | --- | --- |
| Daily active users | 100k–200k | 10–20% of 1M monthly users |
| Average load | ~100 requests/s | ~50 API calls per active user per day |
| Normal peak | ~1,000 requests/s | 5–10× the average in evening peaks |
| Sale-day peak | ~10,000 requests/s | about 10× a normal peak for a few hours |
| Orders | a few per second at peak | 2–3% conversion |

About **90% of traffic is catalogue reads**, which are cacheable. The problem is therefore mostly
serving reads cheaply, plus absorbing checkout spikes safely.

### Client: generate less load

- Catalogue responses are cached (TTL + `ETag`), so revisits cost nothing.
- Pagination instead of large lists. Search requests are debounced and cancelled when superseded.
- Images come from a CDN in the size the screen needs. This is the biggest bandwidth lever.
- Retries use jittered back-off, and WebSocket reconnects use back-off, so a backend restart does not
  bring every client back at the same instant.
- **Remote config and feature flags** switch off expensive features (recommendations, live
  inventory) under load.
- **EAS Update** ships JavaScript fixes over the air with staged rollouts (1% → 10% → 100%).

### Edge and gateway

- The CDN serves images and cacheable catalogue responses, so most reads never reach a server.
- The gateway enforces per-user and per-device rate limits. Over the limit it returns 429 early,
  rather than letting requests queue and time out.

### Services

- Services are **stateless** and scale horizontally behind load balancers (ECS/EKS with autoscaling
  on CPU and request count).
- Each service scales separately: catalogue for browsing traffic, order and payment for sale days.
- **Timeouts and circuit breakers** sit on every dependency, especially the payment provider.
- **Bulkheads** separate critical traffic from optional traffic: recommendations can fail without
  affecting checkout.

### Data

| Store | Technology | Why |
| --- | --- | --- |
| Catalogue | OpenSearch for search, plus a Redis cache for hot products | Reads dominate and are cacheable |
| Cart | DynamoDB keyed by customer | Single-digit-millisecond reads and writes at any scale, always writeable |
| Orders | Aurora/Postgres with read replicas | Transactions and reporting; partition by date as volume grows |
| Sessions, rate limits | Redis | Fast, short-lived data |

### Asynchronous work

- Everything that need not happen during checkout goes through queues: emails, push fan-out,
  inventory sync and analytics.
- A sale-day spike becomes a queue that drains, not an outage.
- Consumers are idempotent, since queues deliver at least once.

### Operations

- Tracing from the app's request ID through every service.
- RED metrics (rate, errors, duration) per endpoint.
- SLOs (for example 99.9% checkout availability, p95 under 300 ms) with alerting.
- Load tests before every major sale.
- Multi-AZ deployment everywhere.

### Beyond one million

At 10× the load, move to Amazon's **cell-based architecture**:
- **Cells:** several identical copies of the stack, each serving a slice of customers, so a bad
  deployment or failure affects one cell rather than everyone.
- **Shuffle-sharding** further limits how many customers any one failure can reach.
- **Multi-region** comes next. The service boundaries and idempotent APIs above are what make this
  step possible without rewriting the app.

## 7. Quality and delivery

- TypeScript strict, ESLint with module-boundary rules, Prettier.
- **Tests:**
  - unit tests for pure logic (the checkout state machine, the OTP logic, the sync engines);
  - React Native Testing Library for components;
  - Maestro or Detox end-to-end tests for sign-in → add to cart → checkout on every pull request.
- **CI:** typecheck → lint → unit tests → EAS preview build → E2E → EAS Update to the preview
  channel. Tagging a release promotes the build to the stores.
- **Accessibility:** labels and roles on every control, 44 pt touch targets, dynamic type, and
  screen-reader checks in QA.

## 8. Where to find it in the code

| Concern | File |
| --- | --- |
| Feature public API | `src/features/shop/index.ts` |
| HTTP client, typed errors | `src/core/api/http-client.ts` |
| Jittered retries | `src/core/api/retry.ts`, `src/core/api/base-query.ts` |
| Error copy | `src/core/api/error-message.ts` |
| Server state and caching | `src/features/shop/api/shop-api.ts` |
| Always-writeable, persisted cart | `src/features/shop/cart/state/cart-slice.ts`, `cart-storage.ts`, `src/core/store/listener-middleware.ts` |
| Checkout state machine and tests | `src/features/shop/checkout/state/checkout-machine.ts`, `__tests__/` |
| Idempotent order placement | `src/features/shop/checkout/state/checkout-session.ts` |
| Payment provider seam | `src/features/shop/payments/payment-gateway.ts` |
| Order events and deep links | `src/features/shop/notifications/use-order-updates.ts`, `src/core/notifications/` |
| Graceful degradation | `RelatedProducts` in `src/features/shop/catalog/screens/product-screen.tsx` |
| Per-route error boundary | `src/core/ui/route-error.tsx` |
| Server side: pricing, payments, idempotent orders | `mock-backend/src/http/routes/shop.routes.ts` |

## References

- G. DeCandia et al., [*Dynamo: Amazon's Highly Available Key-value Store*](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf), SOSP 2007.
- J. Gray, [*A Conversation with Werner Vogels*](https://queue.acm.org/detail.cfm?id=1142065), ACM Queue, 2006.
- Amazon Builders' Library:
  - [*Timeouts, retries, and backoff with jitter*](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
  - [*Making retries safe with idempotent APIs*](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
  - [*Using load shedding to avoid overload*](https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/)
  - [*Workload isolation using shuffle-sharding*](https://aws.amazon.com/builders-library/workload-isolation-using-shuffle-sharding/)
- AWS Well-Architected, *Reducing the Scope of Impact with Cell-Based Architecture*.
