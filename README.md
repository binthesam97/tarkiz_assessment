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
| React Native app (Android) | `tarkiz-assessment.apk`: install on an Android phone ("Install unknown apps" must be allowed) |
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
| **RN 5** E-commerce Architecture | [`rn-app/docs/architecture.md`](rn-app/docs/architecture.md) | Feature modules, API layer, state, errors, scaling to 1M users |
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
   - Start a shift with a simulated route (`xcrun simctl location booted start …`) and background
     the app.
7. **System design loop**:
   1. Apply for leave on the phone.
   2. It appears live under *Leave approvals* on the HR portal.
   3. Approve it.
   4. The phone shows the alert and updates the status.

## Engineering notes

- TypeScript strict everywhere, with unit tests where the logic is non-trivial (NgRx reducer,
  form factory, suggestion cache, OTP logic).
- **Fault injection** in the mock backend (latency, failure rate, forced failures, socket drops)
  makes resilience features demonstrable. See [`mock-backend/README.md`](mock-backend/README.md).
- **Framework versions**: Angular 22 (zoneless, signals), NgRx 22, Expo SDK 57 / React Native
  0.86, and TypeScript 6.
