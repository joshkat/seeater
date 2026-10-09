# Seating App

A visual **seating-chart builder** for weddings, galas, or two tables at a dinner party. Lay out
round and rectangular tables with auto- or hand-placed chairs, manage the guest list (add, import
CSV/XLSX, RSVP), and drag guests into seats.

It's **local-first**: the app runs entirely in your browser, works offline, and needs no account.
Signing in is optional and adds backup plus sync across your devices.

> **Status:** Editor, guest seating, RSVP, multi-event dashboard, theming, offline/installable app,
> backups, and optional Clerk sign-in with sync are built. Next candidates: export/print, venue
> templates, undo/redo.

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

If `apps/web/.env.local` contains a Clerk key, you'll also see a "Sign in to sync" button. The app
works fully without using it.

## With sync (optional)

Needs Docker, for local Postgres.

```bash
npm run db:up                                   # Postgres 17 in Docker (docker-compose.yml)
cp apps/api/.env.example apps/api/.env          # defaults match the Docker database
npm run prisma:migrate                          # create the EventDocument table
npm run dev:api                                 # http://localhost:4000
```

Then either:

- **Real accounts:** set `VITE_CLERK_PUBLISHABLE_KEY` in `apps/web/.env.local` and
  `CLERK_SECRET_KEY` in `apps/api/.env`, run `npm run dev:web`, and click "Sign in to sync".
- **No accounts (dev only):** run the web app keyless, syncing as a fixed dev user:

  ```bash
  VITE_CLERK_PUBLISHABLE_KEY= VITE_DEV_SYNC_OWNER=dev-user npm run dev --workspace @seating/web
  ```

### Environment variables

**`apps/web/.env.local`** (all optional)

| Variable                     | Default                     | Notes                                                                                 |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | _(unset)_                   | Enables the optional "Sign in to sync". Unset means a purely local app.               |
| `VITE_API_BASE_URL`          | `http://localhost:4000/api` | Where the sync API lives                                                              |
| `VITE_DEV_SYNC_OWNER`        | _(unset)_                   | Keyless dev only: sync as this owner via `x-owner-id`. Ignored if a Clerk key is set. |

**`apps/api/.env`**

| Variable                | Default                                                                 | Notes                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | `postgresql://seating:seating@localhost:5432/seating_app?schema=public` | Matches `docker-compose.yml`                                                                                 |
| `PORT` / `HOST`         | `4000` / `0.0.0.0`                                                      |                                                                                                              |
| `CORS_ORIGIN`           | `http://localhost:5173`                                                 | Comma-separated web origins. Any `localhost` port is allowed in dev.                                         |
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
| `npm test`                  | All tests (API tests need `npm run db:up`)          |
| `npm run db:up` / `db:down` | Start / stop local Postgres in Docker               |
| `npm run prisma:migrate`    | Apply/create DB migrations                          |
| `npm run format`            | Prettier                                            |

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
- Set `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL` at build time if you offer sync.

That alone is a complete, free-to-run product. Users' data stays in their browsers.

**Sync API (optional):** a small Node service plus Postgres.

- Postgres: any managed provider (Neon, Supabase, RDS). Run
  `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`.
- API: any Node host (Fly.io, Render, Railway). Build, then `npm run start --workspace
@seating/api`, with `NODE_ENV=production`, `DATABASE_URL`, `CLERK_SECRET_KEY`, and
  `CORS_ORIGIN=https://your-web-origin`.

---

## Troubleshooting

- **Canvas crashes in `<StageWrap>` after installing a package:**
  `rm -rf node_modules/.vite apps/web/node_modules/.vite` and restart Vite.
- **Type errors importing `@seating/shared`:** run `npm run build:shared`.
- **Sync badge says "Offline":** the API isn't reachable. Check `npm run dev:api` and
  `VITE_API_BASE_URL`. Your edits are safe locally and will sync when it's back.
- **API exits with Prisma `P1001`:** Postgres isn't running. Run `npm run db:up`.
- **"This event isn't on this device":** events live per browser and per account. Sign in, or
  import a backup.
- **CORS errors:** add the web origin to `CORS_ORIGIN` in `apps/api/.env` (production only;
  localhost is allowed in dev).

---

## Roadmap

- [x] Visual editor (tables, auto/custom chairs, transform, snapping, autosave)
- [x] Guest list, CSV/XLSX import, drag guests onto seats, RSVP marking
- [x] Multi-event dashboard (create, rename, duplicate, delete)
- [x] Local-first: offline, installable, no account required, backups
- [x] Optional sign-in with multi-device sync
- [ ] Export / print (chart PDF, per-table rosters, escort cards)
- [ ] Undo / redo
- [ ] Venue templates
- [ ] Touch-friendly seating on tablets and phones
