#!/bin/sh
# Writes runtime configuration from environment variables, then starts the static file server.
set -eu

if [ -n "${API_URL:-}" ]; then
  {
    echo "window.__APP_CONFIG__ = {"
    echo "  apiUrl: '${API_URL}',"
    echo "  wsUrl: '${WS_URL:?WS_URL must be set together with API_URL}',"
    [ -n "${HR_PORTAL_URL:-}" ] && echo "  hrPortalUrl: '${HR_PORTAL_URL%/}',"
    [ -n "${EMPLOYEE_APP_URL:-}" ] && echo "  employeeAppUrl: '${EMPLOYEE_APP_URL%/}',"
    [ -n "${ASSESSMENT_URL:-}" ] && echo "  assessmentUrl: '${ASSESSMENT_URL%/}',"
    echo "};"
  } > /srv/config.js
fi

# Micro-frontend host only: point the federation manifest at the deployed remote.
if [ -n "${EMPLOYEE_REMOTE_URL:-}" ] && [ -f /srv/federation.manifest.json ]; then
  printf '{\n  "employee": "%s/remoteEntry.json"\n}\n' "${EMPLOYEE_REMOTE_URL%/}" > /srv/federation.manifest.json
fi

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
