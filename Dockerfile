# Production image for the web app: a static build served by static-web-server
# (a single Rust binary on `scratch`). No Node, no shell, no package manager in
# the final image — about 9 MB in all.
#
#   docker build -t seeater .
#   docker run -p 8090:8080 seeater
#
# The app is local-first: guests' events live in each browser's IndexedDB, so
# the container holds no data and needs no volume. Sync stays off (no
# VITE_ENABLE_SYNC at build time), so the bundle makes no network calls.

# --- build -------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Manifests first so the dependency layer is cached across source edits. Every
# workspace's package.json is needed for `npm ci` to match the lockfile, but
# only the web app, the shared package and the root tooling get installed.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/e2e/package.json apps/e2e/
RUN npm ci --ignore-scripts --no-audit --no-fund \
      --workspace @seating/shared --workspace @seating/web --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build:shared && npm run build --workspace @seating/web

# --- runtime -----------------------------------------------------------------
FROM joseluisq/static-web-server:2.44.1

COPY --from=build /app/apps/web/dist /public
COPY docker/static-web-server.toml /etc/static-web-server.toml

ENV SERVER_CONFIG_FILE=/etc/static-web-server.toml
# Unprivileged user; the server listens on 8080 so it needs no capabilities.
USER 65534:65534
EXPOSE 8080
