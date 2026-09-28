# Angular Advanced Coding Questions

Angular 22 · standalone components · signals · zoneless · NgRx 22 · Angular CDK.
Questions 1–5 live in this application; Question 6 (Micro Frontends) is a separate workspace in [`../mfe`](../mfe).

## Running

```bash
# 1. Mock backend (REST + WebSocket) — required by Q2, Q3 and Q4
cd ../mock-backend && npm install && npm start

# 2. This app
npm install
npm start            # http://localhost:4200
npm test             # unit tests (Vitest)
```

## Where to look

| # | Challenge | Route | Key files |
| - | --------- | ----- | --------- |
| 1 | Dynamic Form Builder | `/dynamic-form` | `features/dynamic-form/core/*` — `ControlRegistry`, `ValidatorRegistry`, `DynamicFormFactory` |
| 2 | NgRx Product Management | `/products` | `features/products/state/*` — actions, entity reducer with rollback snapshots, functional effects |
| 3 | Real-Time Notifications | `/notifications` | `features/notifications/data/notification-socket.service.ts`, `state/notification.store.ts` |
| 4 | RxJS Autocomplete | `/autocomplete` | `features/autocomplete/autocomplete.component.ts`, `suggestion.service.ts` |
| 5 | Rendering 10,000 Records | `/performance` | `features/performance/*` and [`docs/performance.md`](docs/performance.md) |

## Design notes

**Q1 — Dynamic forms.** The JSON config maps directly onto `FieldConfig`. Control types are resolved
from a DI-backed registry (`provideDynamicForms(...)`), so a new type is added by registering a component,
without editing the form builder (Open/Closed). Validators work the same way (`provideDynamicValidators`).
The `/dynamic-form` route registers a custom `rating` control and a `noDigits` validator to show this.
Error messages come from the validator registry and can be overridden per field in the JSON.

**Q2 — NgRx.** `createFeature` + `@ngrx/entity`. Every mutation is optimistic. Before an update or
delete, the reducer stores the last server-confirmed copy in `snapshots`, and a failure action restores
it. Creates use a client-generated id, so the optimistic and persisted entities share a key. Effects use
a different flattening operator depending on the operation: `exhaustMap` for loads, `concatMap` for
updates (preserves order), and `mergeMap` for independent creates and deletes. Load, per-row pending and
error states are all modelled explicitly. Use the "Fail all create / update / delete requests" toggle to
watch the rollback.

**Q3 — Notifications.** `NotificationSocket` wraps `rxjs/webSocket`, reconnecting with exponential
back-off plus jitter, capped at 30 s and short-circuited by the browser `online` event, with a heartbeat
ping. `NotificationStore` holds state in a `BehaviorSubject`, persists it to `localStorage` (debounced,
fault-tolerant), and on every reconnect backfills notifications missed while offline. It de-duplicates
by id. "Drop connection" on the page asks the server to kill all sockets to demonstrate recovery.

**Q4 — Autocomplete.** `debounce → distinctUntilChanged → switchMap`. `switchMap` cancels the
superseded HTTP request. Results are cached as `shareReplay` observables in a bounded LRU map, which also
de-duplicates concurrent identical requests. Failed or cancelled lookups are evicted. `retry` runs twice
with exponential back-off for network and 5xx errors only. The request log on the page shows each of these.

**Q5 — Performance.** See [`docs/performance.md`](docs/performance.md) for the measured before/after numbers.

## Conventions

- Standalone components, OnPush everywhere, signals for component state, and RxJS where streams fit better (sockets, search).
- Each challenge is a lazily loaded route with its providers (NgRx state, registries) scoped to the route.
- `core/mock-network` is demo tooling only. It forwards latency and failure settings to the mock backend as headers.
