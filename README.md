# Seating App

[![CI](https://github.com/joshkat/custom-seating-app/actions/workflows/ci.yml/badge.svg)](https://github.com/joshkat/custom-seating-app/actions/workflows/ci.yml)

A visual **seating-chart builder** for weddings, galas, or two tables at a dinner party. Lay out
round and rectangular tables with auto- or hand-placed chairs, manage the guest list (add, import
CSV/XLSX, RSVP), and drag guests into seats.

It's **local-first**: the app runs entirely in your browser, works offline, and needs no account.
Optional sign-in with multi-device sync is built but **switched off for now** (behind
`VITE_ENABLE_SYNC`), so the shipped app is local-only and makes no network calls.

> **Status:** Editor, guest seating, RSVP, multi-event dashboard, theming, offline/installable app
> and backups are built. Sign-in + sync exist behind a flag. Next candidates: export/print,
> undo/redo, venue templates.

## Documentation

- **[docs/architecture.md](docs/architecture.md)**: how it's built and how data flows (start here).
- **[docs/data-model.md](docs/data-model.md)**: the event document, where data is stored (with
  diagrams), and how much space it takes.
- **[docs/sync.md](docs/sync.md)**: the optional sign-in sync protocol and conflict policy.
- **[docs/reviewing-local-first.md](docs/reviewing-local-first.md)**: guide to auditing the
  local-first migration.
- **[docs/project-structure.md](docs/project-structure.md)**: annotated map of every folder.
- **[docs/styling.md](docs/styling.md)**: the Tailwind/DaisyUI theming system.
- **[CLAUDE.md](CLAUDE.md)**: terse cheatsheet and hard-won gotchas.

---

## Tech stack

| Layer   | Tech                                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Web     | React 18 + Vite, react-konva canvas, zustand, React Router, Tailwind v4 + DaisyUI                          |
| Storage | **IndexedDB** via [Dexie](https://dexie.org) (one JSON document per event); PWA service worker for offline |
| Shared  | `@seating/shared`: zod schema for the event document, pure edit operations, seat geometry, sync types      |
| Sync    | _Optional._ Fastify 5 + Prisma + PostgreSQL, storing versioned documents per account                       |
| Auth    | _Optional._ [Clerk](https://clerk.com) (email/password + Google)                                           |
| Tests   | Vitest (shared ops, web storage/sync in Node with fake-indexeddb, API against real Postgres)               |

npm-workspaces monorepo:

```
packages/shared   @seating/shared   — event-document schema + ops + geometry (the contract)
apps/web          @seating/web      — the app (everything users do happens here)
apps/api          @seating/api      — optional sync API
```

---

## Quick start (just the app)

You only need Node.js >= 20. No database, no API, no keys.

```bash
npm install
npm run build:shared
npm run dev:web          # http://localhost:5173
```

That's the whole app as shipped today: local-only, no sign-in.

## With sync (optional, off by default)

Sign-in and sync are built but disabled unless the web app is started or built with
`VITE_ENABLE_SYNC=true`. To work on them, you need Docker for local Postgres:

```bash
npm run db:up                                   # Postgres 17 in Docker (docker-compose.yml)
cp apps/api/.env.example apps/api/.env          # defaults match the Docker database
npm run prisma:migrate                          # create the EventDocument table
npm run dev:api                                 # http://localhost:4000
```

Then either:

- **Real accounts:** set `VITE_ENABLE_SYNC=true` and `VITE_CLERK_PUBLISHABLE_KEY` in
  `apps/web/.env.local`, and `CLERK_SECRET_KEY` in `apps/api/.env`. Run `npm run dev:web` and
  click "Sign in to sync".
- **No accounts (dev only):** run the web app keyless, syncing as a fixed dev user:

  ```bash
  VITE_ENABLE_SYNC=true VITE_CLERK_PUBLISHABLE_KEY= VITE_DEV_SYNC_OWNER=dev-user npm run dev --workspace @seating/web
  ```

### Environment variables

**`apps/web/.env.local`** (all optional)

| Variable                     | Default                     | Notes                                                                                 |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `VITE_ENABLE_SYNC`           | _(unset)_                   | `true` turns sign-in + sync on. Unset: local-only, no Clerk, no network calls.        |
| `VITE_CLERK_PUBLISHABLE_KEY` | _(unset)_                   | With sync on: enables the optional "Sign in to sync".                                 |
| `VITE_API_BASE_URL`          | `http://localhost:4000/api` | Where the sync API lives                                                              |
| `VITE_DEV_SYNC_OWNER`        | _(unset)_                   | Keyless dev only: sync as this owner via `x-owner-id`. Ignored if a Clerk key is set. |

**`apps/api/.env`**

| Variable                | Default                                                                 | Notes                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | `postgresql://seating:seating@localhost:5432/seating_app?schema=public` | Matches `docker-compose.yml`                                                                                 |
| `PORT` / `HOST`         | `4000` / `0.0.0.0`                                                      |                                                                                                              |
| `CORS_ORIGIN`           | `http://localhost:5173`                                                 | Comma-separated web origins. Any `localhost` port is allowed in dev.                                         |
| `RATE_LIMIT_MAX`        | `300`                                                                   | Requests per minute per client IP (`/api/health` is exempt).                                                 |
| `TRUST_PROXY`           | `false`                                                                 | `true` (or proxy IPs/CIDRs) when behind a load balancer, so rate limiting sees real client IPs.              |
| `CLERK_SECRET_KEY`      | _(unset)_                                                               | When set, every request must carry a valid Clerk session. Unset means keyless dev (owner from `x-owner-id`). |
| `CLERK_PUBLISHABLE_KEY` | _(unset)_                                                               | Optional, used by Clerk's middleware                                                                         |

`VITE_*` variables are read when Vite starts, and the API reads `.env` at boot, so restart after
changing either.

---

## Scripts (from the repo root)

| Command                     | What it does                                        |
| --------------------------- | --------------------------------------------------- |
| `npm run dev:web`           | Vite dev server                                     |
| `npm run dev:api`           | API in watch mode                                   |
| `npm run build:shared`      | Compile `@seating/shared` (re-run after editing it) |
| `npm run typecheck`         | Typecheck every workspace                           |
| `npm run lint`              | ESLint (TypeScript + React hooks rules)             |
| `npm run format:check`      | Prettier check (what CI runs)                       |
| `npm test`                  | All tests (API tests need `npm run db:up`)          |
| `npm run db:up` / `db:down` | Start / stop local Postgres in Docker               |
| `npm run prisma:migrate`    | Apply/create DB migrations                          |
| `npm run format`            | Prettier (write)                                    |

**CI** (`.github/workflows/ci.yml`) runs on every PR and push to `main`: lint, format check,
typecheck, all tests against a real Postgres, and both production builds.

Builds: `npm run build --workspace @seating/web` (static files in `apps/web/dist/`, including the
service worker) and `npm run build --workspace @seating/api`. To try the offline app locally, run
`npm run build --workspace @seating/web` and then `npm run preview --workspace @seating/web`.

---

## Deploying

**Web app (required):** it's a static site. Host `apps/web/dist/` on any static host or CDN
(Cloudflare Pages, Netlify, Vercel, S3 + CloudFront).

- Rewrite unknown paths to `/index.html` so `/events/:id` works on a fresh load. Netlify:
  `/* /index.html 200`. Cloudflare Pages and Vercel do this for SPAs.
- Serve over HTTPS. IndexedDB, `crypto.randomUUID` and service workers need a secure context.
- Nothing to configure for the local-only app. If you later offer sync, set `VITE_ENABLE_SYNC=true`,
  `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL` at build time.

That alone is a complete, free-to-run product. Users' data stays in their browsers.

**Sync API (only once sync is enabled):** a small Node service plus Postgres.

- Postgres: any managed provider (Neon, Supabase, RDS). Run
  `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`.
- API: any Node host (Fly.io, Render, Railway). Build, then `npm run start --workspace
@seating/api`, with `NODE_ENV=production`, `DATABASE_URL`, `CLERK_SECRET_KEY`, and
  `CORS_ORIGIN=https://your-web-origin`, plus `TRUST_PROXY=true` behind the host's load balancer.

---

## Troubleshooting

- **Canvas crashes in `<StageWrap>` after installing a package:**
  `rm -rf node_modules/.vite apps/web/node_modules/.vite` and restart Vite.
- **Type errors importing `@seating/shared`:** run `npm run build:shared`.
- **Sync badge says "Offline":** the API isn't reachable. Check `npm run dev:api` and
  `VITE_API_BASE_URL`. Your edits are safe locally and will sync when it's back.
- **API exits with Prisma `P1001`:** Postgres isn't running. Run `npm run db:up`.
- **"This event isn't on this device":** events live per browser (and per account, when sync is
  on). Import a backup, or open the browser and port where you made it.
- **CORS errors:** add the web origin to `CORS_ORIGIN` in `apps/api/.env` (production only;
  localhost is allowed in dev).

---

## Roadmap

- [x] Visual editor (tables, auto/custom chairs, transform, snapping, autosave)
- [x] Guest list, CSV/XLSX import, drag guests onto seats, RSVP marking
- [x] Multi-event dashboard (create, rename, duplicate, delete)
- [x] Local-first: offline, installable, no account required, backups
- [x] Sign-in with multi-device sync (built; disabled until we're ready to run the API)
- [x] CI, linting, API rate limiting and security headers
- [ ] Dependency majors: React 19, Vite 6+ / Vitest 4+ (clears the remaining dev-only advisories),
      Prisma 6, zod 4
- [ ] Undo / redo
- [ ] Export / print (chart PDF, per-table rosters, escort cards)
- [ ] Venue templates
- [ ] Touch-friendly seating on tablets and phones
- [ ] Error reporting (Sentry, or a simple "email us about a problem" link)
- [ ] Turn sign-in + sync back on (deploy the API, enable `VITE_ENABLE_SYNC`)
