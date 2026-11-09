# Production image for the sync API (@seating/api + @seating/shared).
# Build from the repository root (the API needs the shared package and the
# workspace lockfile):
#
#   docker build -f apps/api/Dockerfile -t seeater-api .
#
# On start it applies pending Prisma migrations (`prisma migrate deploy`, which
# reads DATABASE_URL through apps/api/prisma.config.ts) and then runs the
# server. See docker/compose.yml for the full stack and docs/hosting.md.

# --- shared base: manifests + OpenSSL ------------------------------------------
FROM node:24-alpine AS base
WORKDIR /app
# Prisma's schema engine is the musl + OpenSSL 3 build; it probes for libssl.
RUN apk add --no-cache openssl
ENV CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1
# Every workspace's package.json is needed for `npm ci` to match the lockfile,
# but only the API and the shared package get installed.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/e2e/package.json apps/e2e/

# --- build: full toolchain, prisma generate + tsc -------------------------------
FROM base AS build
RUN npm ci --ignore-scripts --no-audit --no-fund \
      --workspace @seating/shared --workspace @seating/api
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
# `build` runs `prisma generate` (the client is TypeScript in
# src/generated/prisma, compiled into dist/) and then tsc. A dummy URL is
# enough: generate only needs prisma.config.ts to load.
RUN npm run build:shared \
  && DATABASE_URL=postgresql://build@localhost/build npm run build --workspace @seating/api

# --- runtime dependencies: production deps + the Prisma CLI ----------------------
FROM base AS deps
# The Prisma CLI is a devDependency but `migrate deploy` needs it, so it's added
# back at the lockfile's version. Install scripts are off; the schema engine
# is fetched explicitly, so the container never downloads anything at runtime.
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
      --workspace @seating/shared --workspace @seating/api \
  && prisma_version=$(node -p 'require("./package-lock.json").packages["node_modules/prisma"].version') \
  && npm install --no-save --omit=dev --ignore-scripts --no-audit --no-fund \
      --workspace @seating/api "prisma@$prisma_version" \
  && node node_modules/@prisma/engines/scripts/postinstall.js \
  # The generated client only loads the PostgreSQL query compiler; the other
  # databases' copies are ~60 MB.
  && find node_modules/@prisma/client/runtime -name 'query_compiler_*' \
      ! -name '*postgresql*' -delete \
  && rm -rf /root/.npm

# --- runtime --------------------------------------------------------------------
FROM node:24-alpine
WORKDIR /app/apps/api
# OpenSSL for the schema engine; drop npm/yarn/corepack (unused at runtime).
RUN apk add --no-cache openssl \
  && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
      /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

ENV NODE_ENV=production CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1 \
    HOST=0.0.0.0 PORT=4000

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/packages/shared/package.json /app/packages/shared/
COPY --from=build /app/packages/shared/dist /app/packages/shared/dist
COPY --from=build /app/apps/api/package.json /app/apps/api/prisma.config.ts ./
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/dist ./dist
# Executable in git, so the mode survives (no `COPY --chmod`: the box may build
# without BuildKit).
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# The image's built-in unprivileged user; the app tree stays root-owned, so
# it can't modify the code it runs.
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:4000/api/health || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
