# Angular & React Native Advanced Coding Assessment

Solutions to all 13 questions: 6 Angular, 6 React Native and the end-to-end system design.
Everything runs locally against a shared mock backend.

```
mock-backend/   Express + WebSocket API shared by every app (port 3000)
angular-app/    Angular Q1–Q5 (port 4200)
mfe/            Angular Q6 — micro frontends: host (4300) + employee remote (4301)
rn-app/         React Native Q1–Q6 + the mobile side of the system design (Expo dev build)
docs/           System design
```

## Live demo

No setup needed. Everything is hosted (details in [DEPLOYMENT.md](DEPLOYMENT.md)):

| What | Link |
| --- | --- |
| Angular Q1–Q5 | https://web-production-ab1807.up.railway.app |
| Angular Q6 (micro frontends) and HR portal | https://hr-portal-production-3888.up.railway.app |
| React Native app (Android) | [Download `tarkiz-assessment.apk`](https://github.com/binthesam97/tarkiz_assessment/releases/download/V1.0/tarkiz-assessment.apk) ([release notes](https://github.com/binthesam97/tarkiz_assessment/releases/tag/V1.0)). Install on an Android phone; "Install unknown apps" must be allowed |
| Backend API | https://backend-production-5439f.up.railway.app |

Demo accounts: `admin@acme.test / Admin@123`, `hr@acme.test / Hr@12345`, `employee@acme.test / Emp@12345`.

## Question map

| Question | Where | Highlights |
| --- | --- | --- |
| **Angular 1** Dynamic Form Builder | `angular-app` → `/dynamic-form` | JSON → reactive form; DI-backed control and validator registries (new types without modifying the builder) |
| **Angular 2** NgRx State Management | `angular-app` → `/products` | Entity state, functional effects, loading/error states, optimistic CRUD with rollback |
| **Angular 3** Real-Time Notifications | `angular-app` → `/notifications` | WebSocket with back-off reconnection and backfill, categories, read state, localStorage persistence |
| **Angular 4** RxJS Autocomplete | `angular-app` → `/autocomplete` | debounce, `switchMap` cancellation, `shareReplay` LRU cache, `retry` ×2 with back-off, live request log |
| **Angular 5** 10,000 Records | `angular-app` → `/performance` | OnPush, virtual scrolling, trackBy, memoisation, `@defer`, with live metrics — [write-up](angular-app/docs/performance.md) |
| **Angular 6** Micro Frontends | `mfe/` | Native Federation, independent deploys, shared components, shared auth — [README](mfe/README.md) |
| **RN 1** Offline-First Directory | `rn-app` → Employee Directory | SQLite + outbox, delta sync, version conflicts, NetInfo-triggered sync |
| **RN 2** 50,000-Product FlatList | `rn-app` → Products | Infinite scroll, pull to refresh, search; paginated and all-in-memory modes |
| **RN 3** OTP Component | `rn-app/packages/otp-input` | Publish-ready package: auto-advance, backspace, paste/autofill, validation, unit tests |
| **RN 4** Background Location | `rn-app` → Field Tracker | Background task, ~30 s sampling, SQLite route history, idempotent batch upload |
| **RN 5** E-commerce Architecture | `rn-app` → E-commerce Store; [summary below](#e-commerce-architecture-rn-5) | Amazon-style service boundaries, API layer, state, errors, scaling to 1M users, plus a working reference store |
| **RN 6** Chat | `rn-app` → Team Chat | Receipts, typing, offline queue, ordering, 1,000-message burst via batching |
| **System Design** | [`docs/system-design.md`](docs/system-design.md) | Architecture, JWT, RBAC, offline, push, caching, WebSockets, CI/CD — plus a working slice |

## Quick start

Requirements: Node 20+ (tested on 24), npm, and Xcode (iOS) or Android Studio for the mobile app.

```bash
# 1. Backend (keep running)
cd mock-backend && npm install && npm start

# 2. Angular Q1–Q5 → http://localhost:4200
cd angular-app && npm install && npm start

# 3. Micro frontends → http://localhost:4300
cd mfe && npm install
npm run start:employee      # terminal A
npm run start:host          # terminal B

# 4. React Native (development build)
cd rn-app && npm install && npx expo run:ios
```

**Demo accounts** (mock data): `admin@acme.test / Admin@123`, `hr@acme.test / Hr@12345`,
`employee@acme.test / Emp@12345`.

## Suggested demo script

1. **Autocomplete**: type `ind`, then `indo`, then back to `ind` (cache hit). Raise the latency to
   show cancellation, and the failure rate to show two retries.
2. **NgRx**: adjust stock (instant), enable *Fail all mutations*, and adjust again to see the
   rollback.
3. **Notifications**: *Drop connection*, watch the reconnect, then refresh the page; read state
   persists.
4. **10,000 records**: sort and search the 10,000 rows. The metrics show the render time and
   only ~310 DOM nodes; the before/after comparison is in `angular-app/docs/performance.md`.
5. **Micro frontends**: sign in as HR (the Employees remote loads at runtime) and as Employee
   (blocked; the remote is never downloaded). Stop the remote to see the graceful fallback.
6. **Mobile**:
   - Stop the backend, edit an employee (*Not synced*), restart, then pull to refresh.
   - Run *Simulate 1000* in chat.
   - In the E-commerce Store, add to cart and check out as the demo employee. Try the declined
     test card first, then the approved one, and watch the *Order confirmed* notification arrive.
   - Start a shift with a simulated route (`xcrun simctl location booted start …`) and background
     the app.
7. **System design loop**:
   1. Apply for leave on the phone.
   2. It appears live under *Leave approvals* on the HR portal.
   3. Approve it.
   4. The phone shows the alert and updates the status.

## Engineering notes

- TypeScript strict everywhere, with unit tests where the logic is non-trivial (NgRx reducer,
  form factory, suggestion cache, OTP logic, checkout state machine).
- **Fault injection** in the mock backend (latency, failure rate, forced failures, socket drops)
  makes resilience features demonstrable. See [`mock-backend/README.md`](mock-backend/README.md).
- **Framework versions**: Angular 22 (zoneless, signals), NgRx 22, Expo SDK 57 / React Native
  0.86, and TypeScript 6.

## E-commerce architecture (RN 5)

The design for the six required modules (Authentication, Product Catalog, Cart, Checkout, Payments,
Notifications), with the client side implemented as a working store in `rn-app/src/features/shop`.
Full write-up: [`rn-app/docs/architecture.md`](rn-app/docs/architecture.md).

### Why this architecture

It follows the principles Amazon has published about its own commerce platform, at a scale that
suits one million users:

| Amazon practice | Applied here |
| --- | --- |
| Small teams own services and talk only through APIs ("you build it, you run it") | One backend service per domain, each owning its data; one app feature module per domain with a public `index.ts` |
| The shopping cart is "always writeable" (Dynamo paper) | The cart lives on the device: adding always works, even offline. The server re-prices it; client prices are never trusted |
| Strong consistency where money moves | The server calculates every total and the payment amount; the order service re-checks it before accepting the order |
| Timeouts, retries and back-off with jitter | One HTTP client with timeouts; reads retry transient errors (network, 429, 5xx) with jittered back-off |
| Retries made safe with idempotent APIs | Each checkout sends one `Idempotency-Key`: a retry returns the same order and never charges twice |
| Pages built from independent parts | Optional sections ("More in this category") hide themselves on failure; each screen has its own error boundary |
| Event-driven work behind the order | The order service publishes `OrderPlaced` for notifications and other consumers; in the app, modules react to events (checkout emits `orderPlaced`, the cart clears itself) |

Amazon runs very many services; this design keeps the same boundaries with **six services**, so any
of them can be split later without changing the app.

### System overview

```
React Native app ──► CDN (images, cacheable catalogue) ──► API gateway / BFF (auth, rate limits)
                                                               │
      ┌──────────────┬───────────────┬───────────────┬─────────┴───────┬──────────────┐
  Identity      Catalogue +       Cart           Pricing          Checkout /        Payment
               search index    (DynamoDB)                     Order (Postgres)   (provider SDK
                                                                     │            + webhooks)
                                             event bus: OrderPlaced ─┴─► Notifications (push, WebSocket),
                                                                         inventory, email, analytics
```

### Mobile app structure

| Concern | Approach |
| --- | --- |
| Folder structure | `app/` thin routes → `features/<module>/` (api, state, components, screens, `index.ts`) → `core/` shared infrastructure (HTTP client, store, UI) |
| API layer | RTK Query endpoints on a shared base query: caching per endpoint, tag invalidation, refetch on reconnect |
| State management | Server data in RTK Query; the cart in a persisted Redux slice; checkout as an explicit state machine (`address → shipping → payment → confirming → done / failed`) with unit tests |
| Error handling | Typed errors mapped to one set of user-facing messages; declined payments and timeouts handled without double charges |
| Payments | The provider sits behind a `PaymentGateway` interface; card data never touches the app or our servers |

### Scaling to 1 million users

| Estimate | Figure |
| --- | --- |
| Daily active users | 100k–200k |
| Normal peak | ~1,000 requests/s |
| Sale-day peak | ~10,000 requests/s |
| Share of traffic that is cacheable catalogue reads | ~90% |

- **Client:** cached catalogue, pagination, correctly sized images, jittered retries and reconnects,
  remote feature flags and over-the-air updates with staged rollouts.
- **Edge and services:** a CDN absorbs most reads; stateless services scale horizontally and
  independently; timeouts, circuit breakers and bulkheads keep optional features from affecting
  checkout.
- **Data:** a search index plus Redis for the catalogue, DynamoDB for carts, Postgres with read
  replicas for orders.
- **Asynchronous work:** email, push, inventory and analytics go through queues, so a sale-day spike
  becomes a backlog that drains rather than an outage.
- **Beyond 1M:** cell-based architecture and shuffle-sharding to limit the impact of any failure,
  then multiple regions.
