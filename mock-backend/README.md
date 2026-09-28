# Mock Backend

A lightweight Express + WebSocket server that backs both the Angular and React Native
solutions. All data is held in memory and resets on restart.

```bash
npm install
npm start          # http://localhost:3000
```

## Demo accounts

| Email                | Password    | Roles                 |
| -------------------- | ----------- | --------------------- |
| `admin@acme.test`    | `Admin@123` | ADMIN, HR, EMPLOYEE   |
| `hr@acme.test`       | `Hr@12345`  | HR, EMPLOYEE          |
| `employee@acme.test` | `Emp@12345` | EMPLOYEE              |

## REST API (`/api`)

| Method | Path                           | Notes                                                          |
| ------ | ------------------------------ | -------------------------------------------------------------- |
| POST   | `/auth/login`                  | Returns access token (15 min), refresh token (7 days), user   |
| POST   | `/auth/refresh`                | Exchanges a refresh token for a new token pair                 |
| GET    | `/auth/me`                     | Requires bearer token                                          |
| CRUD   | `/products`                    | Used by the NgRx product module                                |
| CRUD   | `/employees`                   | `?updatedSince=<ISO>` for delta sync; `PUT` checks `version` (409 on conflict) |
| GET    | `/catalog`                     | 50,000 items — `?page=&limit=&q=`                              |
| GET    | `/search`                      | Autocomplete suggestions — `?q=`                               |
| POST   | `/locations/batch`             | Route points upload, idempotent on batch `id`                  |
| GET    | `/locations/:employeeId`       | Stored route history                                           |
| GET    | `/notifications`               | `?since=<ISO>` backfill of broadcast notifications after a reconnect |
| GET    | `/attendance/me`               | Authenticated                                                  |
| POST   | `/attendance/check-in` / `check-out` | Authenticated, idempotent per day                        |
| GET/POST | `/leaves/me`, `/leaves`      | Authenticated                                                  |
| GET/PATCH | `/leaves`, `/leaves/:id`    | HR / ADMIN only; approval pushes a targeted notification       |
| GET    | `/reports/headcount`           | HR / ADMIN only                                                |
| GET    | `/shop/products`, `/shop/products/:id`, `/shop/categories` | Storefront (60 products) — `?category=&q=`         |
| POST   | `/shop/quote`                  | Server-calculated totals for `{ items, shippingOption }`       |
| POST   | `/shop/payment-intents`        | Authenticated; amount is computed from the cart, not sent by the client |
| POST   | `/shop/gateway/payment-intents/:id/confirm` | Mock payment provider. Test methods: `pm_card_success`, `pm_card_declined`, `pm_card_insufficient_funds` |
| POST   | `/shop/orders`                 | Authenticated; requires an `Idempotency-Key` header (a replay returns the original order) |
| GET    | `/shop/orders`, `/shop/orders/:id` | Authenticated; `?idempotencyKey=` to recover after a timed-out order request |

## WebSockets

| Path                               | Purpose                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| `/ws/notifications?token=<jwt>`    | Live notification feed. Token optional (enables targeted messages). |
| `/ws/chat?userId=<id>`             | Chat: messages, acks, delivery/read receipts, typing, offline sync. Protocol documented in `src/realtime/chat.socket.ts`. |

## Fault injection

Used to demonstrate retries, optimistic-update rollback and reconnection.

| Control                                | Effect                                          |
| -------------------------------------- | ----------------------------------------------- |
| `PUT /api/_admin/chaos` `{ latencyMs, failureRate }` | Global latency / failure probability (default 300 ms, 0) |
| Header `x-mock-latency: <ms>`          | Per-request latency                             |
| Header `x-mock-failure-rate: <0–1>`    | Per-request failure probability                 |
| Header `x-mock-fail: true`             | Force HTTP 503                                  |
| `POST /api/_admin/notifications`       | Push a notification on demand                   |
| `POST /api/_admin/ws/disconnect`       | Drop all notification sockets                   |
