# Micro Frontends — Host + Employee

Angular Q6. Two independently built and deployed Angular applications composed at runtime,
sharing UI components and a single authentication session.

```
mfe/
├── projects/host       Shell application  (http://localhost:4300)
├── projects/employee   Employee remote    (http://localhost:4301)
└── projects/shared     @acme/shared — auth, guards, UI components, theme
```

## Running

Requires the mock backend (`../mock-backend`, port 3000).

```bash
npm install
npm run start:employee   # terminal 1 — remote
npm run start:host       # terminal 2 — host, open http://localhost:4300
```

Demo accounts: `admin@acme.test / Admin@123`, `hr@acme.test / Hr@12345`, `employee@acme.test / Emp@12345`.

## Architecture

```
 Browser ── http://localhost:4300 (host)
   │
   ├─ federation.manifest.json ──► { "employee": "http://localhost:4301/remoteEntry.json" }
   │
   ├─ /login, /dashboard, /forbidden      rendered by the host
   ├─ /leave-approvals  (HR|ADMIN)        rendered by the host, live via WebSocket alerts
   └─ /employees/**  ── canMatch(HR|ADMIN) ── loadRemoteModule('employee', './routes')
                                               └─ EMPLOYEE_ROUTES (list, detail/edit)
 Shared singletons: @angular/*, rxjs, @acme/shared (AuthService, interceptor, guards, UI)
```

### Module Federation

The brief mentions Webpack Module Federation. Angular 17+ builds with esbuild by default, so this
uses **Native Federation** (`@angular-architects/native-federation`). It is the same model, built on
web standards (ES modules and import maps) rather than Webpack's runtime, and it does not require
reverting to Angular's legacy Webpack builder.

| Webpack Module Federation      | Here                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| `ModuleFederationPlugin`       | `federation.config.mjs` in each project                      |
| `exposes`                      | Employee exposes `./routes` → `EMPLOYEE_ROUTES`             |
| `remotes`                      | Resolved at runtime from `federation.manifest.json`          |
| `shared: { singleton: true }`  | `fromPackageJson({ singleton: true, strictVersion: true })`  |
| `remoteEntry.js`               | `remoteEntry.json` + import map                              |

Moving to Webpack would change the build configuration only; the routing, sharing and auth design stay the same.

### Independent deployments

- Each application has its own build (`ng build host`, `ng build employee`), its own output
  folder and its own pipeline, so it can be released on its own schedule.
- The host does not compile the remote in. It reads **`federation.manifest.json` at runtime**, so a
  remote can be redeployed or rolled back, or its URL changed per environment, without rebuilding
  the host. In production the manifest is generated per environment (or served from a config
  endpoint) and points at CDN URLs.
- If a remote fails to load, the host catches the error and renders a fallback route (the rest of
  the shell keeps working). You can check this by stopping the employee dev server.
- The contract between host and remote is small and explicit: the remote exposes a `Routes` array.
  Changing it is a breaking change and needs coordinated versioning.

### Shared components

`@acme/shared` is a workspace library mapped through `tsconfig.json` paths. Native Federation shares
it as a **singleton**, so it is loaded once and reused by every micro frontend. It provides:

- `PageHeaderComponent`, `StatCardComponent`, `LoginFormComponent`, and the design tokens (`styles/theme.scss`)
- `HasRoleDirective` for role-based UI

In a multi-repository setup the same library would be published to a private registry under
semantic versioning, with `strictVersion` making incompatible versions fail loudly at startup.

### Shared authentication

- `AuthService` (in `@acme/shared`) owns the session as a signal. Because the library is a
  federation singleton, **the host and the remote use the same instance**: signing in on the
  host authenticates the remote immediately.
- The session (JWT access and refresh tokens) is persisted to `localStorage` and synchronised across
  tabs via the `storage` event.
- `authInterceptor` attaches the bearer token and, on a 401, refreshes the token once (concurrent
  requests share the refresh) before replaying the request. The remote's HTTP calls go through the
  host's `HttpClient`, so they are authenticated without extra wiring.
- `roleGuard` is applied with **`canMatch`**, so users without the HR/Admin role never download
  the employee remote. The API enforces the same roles server-side; client checks only shape the UX.
- Run standalone (`http://localhost:4301`), the remote uses the same shared login form and guards,
  which makes it easy to develop and test in isolation.

The host also subscribes to role-targeted WebSocket alerts (`LiveAlertsService`). New leave requests
from the mobile app appear on *Leave approvals* without a refresh, and approving one alerts the
employee's phone. This is the web side of the system design in [`../docs/system-design.md`](../docs/system-design.md).

For production, tokens would be better held in `HttpOnly` cookies issued by a BFF on the same
parent domain, which protects them from XSS. `AuthService` hides the storage detail, so that
change stays inside the shared library.
