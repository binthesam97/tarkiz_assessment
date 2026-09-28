# Builds one application of the workspace; APP is "host" or "employee" (a Railway service variable).
FROM node:24-alpine AS build
ARG APP=host
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build ${APP}

FROM caddy:2-alpine
ARG APP=host
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /entrypoint.sh
COPY --from=build /app/dist/${APP}/browser /srv
ENTRYPOINT ["/entrypoint.sh"]
