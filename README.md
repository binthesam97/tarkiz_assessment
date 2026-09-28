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
| **RN 5** E-commerce Architecture | `rn-app` → E-commerce Store; [summary below](#e-commerce-architecture-rn-5) | Service boundaries, API layer, state, errors, scaling to 1M users, plus a working reference store |
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

RN question 5 asks for an e-commerce app architecture (auth, catalog, cart, checkout, payments and
notifications), why it was chosen, and how it scales to a million users. The full write-up is in
[`rn-app/docs/architecture.md`](rn-app/docs/architecture.md). I also built the client side as a
working store, which you can open from the app's home screen as **E-commerce Store**.

### Why this design

A million users is big enough that the design has to scale, but not so big that it needs hundreds
of microservices. I built it around a few decisions:

- Each business area (catalogue, cart, pricing, orders, payments, notifications) is its own service
  with its own data, owned by one team. The app is organised the same way, one feature module per
  area, so a team owns its slice end to end.
- The cart can always be written to. Refusing "add to cart" loses a sale, while a slightly stale
  cart costs nothing. So the cart lives on the phone and works
  offline, and the server re-checks prices and stock before checkout.
- Money is handled strictly. The server calculates every total, the app never sends an amount, and
  every order carries an idempotency key, so a retry after a timeout can't charge anyone twice.
- Failures are contained. Only reads are retried, with randomised back-off, and optional parts of a
  page (like "More in this category") disappear instead of breaking it.
- Work that doesn't need to happen during checkout, such as emails, push notifications and inventory
  updates, runs off an `OrderPlaced` event instead of slowing the order down.

Seven services is plenty at this size. Because the boundaries are in the right places, any of them
can be split further later without changing the app.

### How it fits together

```
React Native app
  → CDN (images, cached catalogue)
  → API gateway (auth, rate limits)
      → identity · catalogue · cart · pricing · orders · payments · notifications
                                              orders ──► event bus ──► notifications, email, inventory
```

In the app, routes are thin and call into feature modules. Server data goes through RTK Query with
a single HTTP client that handles timeouts and errors. The cart is a persisted Redux slice, and
checkout is a small state machine (address → delivery → payment → done) with unit tests.

### Scaling to a million users

A million monthly users is roughly 100k–200k a day. That works out to around 1,000 requests a second
at a normal peak and maybe 10,000 during a big sale. Most of that (about 90%) is people browsing the
catalogue, which caches well. So the plan is mostly about serving reads cheaply and keeping checkout
safe under a spike:

- The app avoids requests it doesn't need: it caches the catalogue, paginates, sizes images to the
  screen, and spreads out its retries.
- A CDN answers most catalogue reads before they reach a server, and the gateway rate-limits early.
- Services are stateless, so each one scales on its own. The catalogue scales for browsing, orders
  and payments for sale days.
- Carts go in DynamoDB, orders in Postgres with read replicas, and the catalogue in OpenSearch with
  Redis in front.
- Emails, push notifications and inventory updates go through queues, so a sale-day spike turns into
  a backlog that drains over a few minutes rather than an outage.

Past a million users, the next step would be a cell-based setup: several copies of the stack,
each serving a slice of customers, so one bad deployment only affects a fraction of them.
