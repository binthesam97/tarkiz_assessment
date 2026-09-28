# Deployment

Everything is hosted on [Railway](https://railway.com) in one project (`acme-assessment`) with four
services. Each service is built from its own folder's `Dockerfile`.

| Service | Source | URL |
| --- | --- | --- |
| `backend` | `mock-backend/` | https://backend-production-5439f.up.railway.app |
| `web` | `angular-app/` | https://web-production-ab1807.up.railway.app |
| `hr-portal` | `mfe/` (`APP=host`) | https://hr-portal-production-3888.up.railway.app |
| `employee-remote` | `mfe/` (`APP=employee`) | https://employee-remote-production.up.railway.app |

## How configuration works

The same build runs locally and on Railway. Nothing environment-specific is compiled into the web apps:

- Each web app loads `config.js` before it boots. Locally it points at `localhost:3000`. In the
  container, `docker/entrypoint.sh` regenerates it from `API_URL` and `WS_URL` at start-up.
- The HR portal's `federation.manifest.json` is regenerated from `EMPLOYEE_REMOTE_URL`. This lets the
  remote be redeployed or moved without rebuilding the host, which is the independent-deployment
  requirement of Angular Q6.
- The static files are served by Caddy (`docker/Caddyfile`), with:
  - fallback to `index.html` for client-side routes;
  - no caching of the runtime files, and long-term caching of hashed bundles;
  - `Access-Control-Allow-Origin: *`, so the host can load the remote from another origin.

The mobile app has no runtime config file. Its backend address is fixed at build time through
`EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL`.

## Service variables

| Service | Variables |
| --- | --- |
| `backend` | `PORT=3000`, `JWT_SECRET`, `ADMIN_KEY` (required to change the global failure rate) |
| `web` | `PORT=8080`, `API_URL`, `WS_URL`, `HR_PORTAL_URL`, `EMPLOYEE_APP_URL` (micro-frontend links) |
| `hr-portal` | `PORT=8080`, `APP=host`, `API_URL`, `WS_URL`, `EMPLOYEE_REMOTE_URL`, `ASSESSMENT_URL` (the back link) |
| `employee-remote` | `PORT=8080`, `APP=employee`, `API_URL`, `WS_URL` |

## Redeploying

From the repository root, with the Railway CLI logged in and linked to the project:

```bash
railway up mock-backend --path-as-root --service backend --detach
railway up angular-app  --path-as-root --service web --detach
railway up mfe          --path-as-root --service employee-remote --detach
railway up mfe          --path-as-root --service hr-portal --detach
```

`.railwayignore` in each folder keeps `node_modules`, `dist` and build caches out of the upload.

## Android APK

Built locally against the hosted backend:

```bash
cd rn-app
export EXPO_PUBLIC_API_URL=https://backend-production-5439f.up.railway.app/api
export EXPO_PUBLIC_WS_URL=wss://backend-production-5439f.up.railway.app/ws
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk (shared as tarkiz-assessment.apk)
```

The APK is signed with the debug key, which is fine for sideloading but not for the Play Store.

Two build prerequisites:
- **NDK 27.1.12297006** must be installed (`sdkmanager --install "ndk;27.1.12297006"`).
- **Gradle memory:** in `android/gradle.properties`, set
  `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`. The generated default (2 GB / 512 MB) runs out of
  metaspace while packaging. `expo prebuild --clean` regenerates this file, so re-apply the setting afterwards.

## Notes

- The backend keeps data in memory. A redeploy or restart resets it to the seed data, and all viewers
  share the same data.
- The backend must run as a single instance, because chat rooms and the notification hub live in
  process memory.
