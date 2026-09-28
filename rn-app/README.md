# React Native Advanced Coding Questions

Expo SDK 57 · React Native 0.86 · TypeScript (strict) · Expo Router · Redux Toolkit + RTK Query ·
expo-sqlite · NetInfo · expo-location / expo-task-manager.

One app hosts every React Native challenge plus the mobile half of the system-design question.
The home screen links to each one.

## Running

The mock backend must be running (`../mock-backend`, port 3000).

Background location and SQLite need native modules, so the app runs as a **development build**
rather than in Expo Go:

```bash
npm install
npx expo run:ios          # or: npx expo run:android — builds, installs and starts Metro
```

After the first build, `npx expo start --dev-client` is enough.

- **Physical device**: start Metro with `EXPO_PUBLIC_API_HOST=<your LAN IP> npx expo start --dev-client`.
- **Android emulator**: the API host defaults to `10.0.2.2`.

```bash
npm run typecheck                 # app + packages
npm test                          # OTP package + checkout state machine unit tests
```

## Where to look

| # | Challenge | Screen | Key files |
| - | --- | --- | --- |
| 1 | Offline-first employee directory | Employee Directory | `src/features/employees/data/{employee-repository,employee-sync,sync-metadata}.ts` |
| 2 | 50,000-product FlatList | Products | `src/features/catalog/screens/product-list-screen.tsx`, `hooks/use-paginated-catalog.ts` |
| 3 | OTP component (publish-ready) | OTP Input | `packages/otp-input` (own README, tests and build) |
| 4 | Background location tracker | Field Tracker | `src/features/tracking/task/{location-task,tracking-service}.ts` |
| 5 | E-commerce architecture | E-commerce Store | [`docs/architecture.md`](docs/architecture.md), `src/features/shop/*` |
| 6 | Chat module | Team Chat | `src/features/chat/state/chat-service.ts`, `data/chat-repository.ts` |
| SD | Employee app (system design) | Employee App | `src/features/hr/*`, `src/features/auth/*` |

## Design notes

**Q1 — Offline-first.** SQLite is the source of truth for records, and AsyncStorage holds small
sync metadata (the delta cursor). Edits update the local row and enqueue an outbox entry in the same
transaction. Repeated edits to one record are coalesced into a single entry that keeps the original
base version. Sync runs in two phases:
1. **Push** the outbox in order. A `409` (version conflict) means the server copy wins, and the user
   is told which record changed.
2. **Pull** a delta via `updatedSince`, skipping rows that still have unsynced edits.

A NetInfo listener triggers the sync on every offline-to-online transition. To try it: stop the
backend, edit an employee (it shows *Not synced*), restart the backend and pull to refresh.

**Q2 — 50,000 products.** Two modes:
- **Paginated API**: infinite scroll, 300 ms debounced search, and `AbortController` cancellation of
  superseded requests.
- **All 50,000 in memory**: shows that virtualisation alone keeps rendering flat.

Both use `getItemLayout` (fixed 88 pt rows), a `React.memo` row with stable `useCallback` handlers,
`windowSize={5}`, batched rendering and `removeClippedSubviews`. `expo-image` uses `recyclingKey` and
a memory/disk cache, and `useDeferredValue` keeps typing responsive while filtering 50k items. The
React Compiler is disabled in `app.json` so that the memoisation is explicit and reviewable.

**Q3 — OTP input.** The state transitions are pure functions with unit tests, and the component is a
thin layer over them:
- **Auto-advance and backspace:** focus moves forward on input, and backspace on an empty cell moves
  back and clears it.
- **Paste, SMS autofill and fast typing:** multi-character input is spread across the cells.
- **Validation:** character sets plus an error state announced to screen readers.
- **API:** controlled or uncontrolled, with an imperative `focus`/`clear` handle.

The package has a `package.json` ready to publish, `prepublishOnly` checks and its own README.

**Q4 — Background tracking.**
- **Task registration:** the task is registered in the JS entry (`index.ts`), so it runs when the OS
  relaunches the app headlessly.
- **Sampling:** Android honours `timeInterval: 30s`. iOS does not, so the task down-samples to one
  fix per ~30 s.
- **Upload:** points are stored in SQLite and uploaded in batches of up to 200. A batch is claimed
  before upload and retried with the same id, which the server de-duplicates, so a crash
  mid-upload never loses or duplicates points.
- **Permissions:** foreground is requested, then background. A missing "Always" grant is a warning,
  not a blocker.

To try it on the iOS simulator:

```bash
xcrun simctl location booted start --speed=20 9.9312,76.2673 9.9500,76.2900 9.9800,76.3200
```

**Q5 — E-commerce architecture.** [`docs/architecture.md`](docs/architecture.md) is the design:
Amazon-style domain services behind a gateway, why it was chosen, and how it scales to one million
users. `src/features/shop` is a working reference store built on it:
- **Cart:** device-owned and always writable, even offline; prices are always re-checked by the server.
- **Checkout:** an explicit state machine, with unit tests.
- **Payments:** behind a gateway interface; the server calculates the amount.
- **Orders:** placed idempotently, so a retry after a timeout never charges twice.
- **Order notifications:** a tap opens the order.

Sign in as the demo employee to check out. The test cards cover approval, a decline and insufficient
funds.

**Q6 — Chat.**
- **Messages:** each has a client-generated UUID as its idempotency key, and is persisted to SQLite
  before sending, so offline messages survive restarts and resend on reconnect.
- **Status:** moves pending → sent (ack) → delivered → read and never goes backwards.
- **Presence:** typing indicators are throttled, with a safety timeout.
- **Ordering:** a server `seq` orders messages that share a timestamp.
- **Load:** incoming frames are buffered and committed every 80 ms as one Redux action plus one SQLite
  transaction, and Redux holds at most 300 messages (older ones page in from SQLite). *Simulate 1000*
  shows the burst.

**System design (mobile).**
- **Auth:** JWT sign-in, with tokens stored in SecureStore.
- **Server data:** RTK Query with tag invalidation.
- **Offline attendance:** check-ins are queued in the outbox, keep their original timestamp and
  replay on reconnect.
- **Alerts:** real-time WebSocket alerts. Actionable ones raise a local notification and invalidate
  the matching cache, so an approved leave updates instantly.
- **Push:** remote push (FCM/APNs) for a closed app is covered in `../docs/system-design.md`.

## Structure

```
index.ts                  entry: registers background tasks, then Expo Router
src/app/                  routes (thin)
src/core/                 api · config · db (migrations, write queue) · store · network · ui
src/features/<feature>/   data · state · components · screens
packages/otp-input/       publishable OTP input package
docs/architecture.md      Q5 design (reference store: src/features/shop)
```
