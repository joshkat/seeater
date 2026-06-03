# Seating App

A web-first visual **event seating-chart builder** — think Ticketmaster's concert
seating map, but for weddings and large venues. Drag-and-drop tables (round or
rectangle) with configurable chair counts, auto- or manually-arranged seats,
pan/zoom, snapping, rotation, and per-operation autosave.

The backend is a REST API, kept deliberately separate from the web client so the
same contract can later power a mobile app.

> **Status:** Milestone 1b complete — the polished editor with guest-seat geometry.
> Guest list / RSVP / invites / wallet passes are planned but not yet built.

---

## Tech stack

| Layer    | Tech |
| -------- | ---- |
| Web      | React 18 + Vite, [react-konva](https://konvajs.org/) canvas, [zustand](https://github.com/pmndrs/zustand) store |
| API      | [Fastify 5](https://fastify.dev/) (TypeScript, ESM), [zod](https://zod.dev/) validation |
| Database | PostgreSQL via [Prisma](https://www.prisma.io/) |
| Shared   | `@seating/shared` — TypeScript domain types + seat-layout geometry, imported by both API and web |

The repo is an **npm workspaces monorepo**:

```
packages/shared   @seating/shared   — types + geometry (the API/web contract)
apps/api          @seating/api      — Fastify REST API
apps/web          @seating/web      — React editor
```

---

## Prerequisites

- **Node.js >= 20** (developed on 26) and **npm >= 10**
- **PostgreSQL** running locally (or any reachable Postgres instance)

On macOS with Homebrew:

```bash
brew install postgresql@14
brew services start postgresql@14
createdb seating_app
```

> The Homebrew Postgres service occasionally stops on its own. If the API can't
> connect (Prisma error `P1001`), restart it with
> `brew services restart postgresql@14`.

---

## Setup

From the repo root:

```bash
# 1. Install all workspace dependencies
npm install

# 2. Build the shared package (API and web import its compiled output)
npm run build:shared

# 3. Configure the API environment
cp apps/api/.env.example apps/api/.env
#   then edit apps/api/.env and set DATABASE_URL to your Postgres connection

# 4. (Optional) configure the web environment — defaults work out of the box
cp apps/web/.env.example apps/web/.env.local

# 5. Create the database schema (runs Prisma migrations + generates the client)
npm run prisma:migrate
```

### Environment variables

**`apps/api/.env`**

| Variable       | Default                                              | Notes |
| -------------- | ---------------------------------------------------- | ----- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/seating_app?schema=public` | Your Postgres connection string. On a default macOS/Homebrew setup the user is your macOS username with no password, e.g. `postgresql://Josh@localhost:5432/seating_app?schema=public`. |
| `PORT`         | `4000`                                               | API port |
| `HOST`         | `0.0.0.0`                                            | API bind host |
| `CORS_ORIGIN`  | `http://localhost:5173`                              | Comma-separated allowed origins (the web dev server) |

**`apps/web/.env.local`**

| Variable             | Default                       | Notes |
| -------------------- | ----------------------------- | ----- |
| `VITE_API_BASE_URL`  | `http://localhost:4000/api`   | Base URL of the API |

---

## Running it

Open **two terminals** from the repo root:

```bash
# Terminal 1 — API on http://localhost:4000
npm run dev:api
```

```bash
# Terminal 2 — web app on http://localhost:5173
npm run dev:web
```

Then open **http://localhost:5173**. On first load the editor creates a default
floor plan ("My Seating Chart") and you can start adding tables.

Health check: `curl http://localhost:4000/api/health` should return `200`.

> **Auth note:** Clerk auth is deferred. In development the API identifies the
> owner via a placeholder user (`dev-user`), so no login is required. The owner
> can be overridden per-request with an `x-owner-id` header.

---

## Useful scripts (run from the repo root)

| Command                    | What it does |
| -------------------------- | ------------ |
| `npm run dev:api`          | Start the API in watch mode (tsx) |
| `npm run dev:web`          | Start the Vite dev server |
| `npm run build:shared`     | Compile `@seating/shared` to `dist/` |
| `npm run prisma:migrate`   | Apply/create DB migrations (Prisma) |
| `npm run prisma:generate`  | Regenerate the Prisma client |
| `npm run typecheck`        | Typecheck every workspace |
| `npm run format`           | Prettier-format the repo |

Per-app builds: `npm run build --workspace @seating/api` and
`npm run build --workspace @seating/web`.

> **Tip:** After editing anything in `packages/shared`, re-run
> `npm run build:shared` so the API and web pick up the changes (the `dev` script
> in shared, `npm run dev --workspace @seating/shared`, can watch-build it for you).

---

## Project layout

```
custom-seating-app/
├── package.json            # workspaces + root scripts
├── tsconfig.base.json      # shared strict TS config
├── packages/
│   └── shared/             # @seating/shared — domain types + seat geometry
│       └── src/
│           ├── types/      # geometry, seat, table, floorPlan, event
│           └── geometry/   # seat-layout math + constants
└── apps/
    ├── api/                # @seating/api — Fastify REST API
    │   ├── prisma/         # schema.prisma + migrations
    │   └── src/
    │       ├── modules/    # floorPlans/, tables/ (routes, service, schema)
    │       ├── plugins/    # prisma plugin
    │       ├── lib/        # mappers, auth, validation
    │       └── server.ts   # bootstrap
    └── web/                # @seating/web — React + Vite editor
        └── src/
            └── features/editor/
                ├── components/  # canvas/ (Konva nodes), Toolbar, PropertiesPanel
                ├── store/       # zustand editor store + persist queue
                ├── geometry/    # snapping
                └── api/         # floorPlan API client
```

---

## Troubleshooting

- **API exits immediately / `P1001` Prisma error** — Postgres isn't running or
  `DATABASE_URL` is wrong. Start Postgres and confirm `createdb seating_app` ran.
- **Web shows "Could not load the floor plan. Is the API running?"** — start the
  API (`npm run dev:api`) and check `VITE_API_BASE_URL`.
- **Type errors importing `@seating/shared`** — run `npm run build:shared`; the
  consumers import its compiled `dist/` output.
- **CORS errors in the browser console** — make sure `CORS_ORIGIN` in
  `apps/api/.env` includes the web origin (`http://localhost:5173`).

---

## Roadmap

- [x] Polished visual editor (tables, auto/custom chairs, transform, snapping, autosave)
- [ ] Guest list + CSV import, drag guests onto seats
- [ ] "Popular venue" template gallery
- [ ] Send invites (email / SMS) + RSVP pages
- [ ] Apple Wallet & Google Wallet passes after RSVP
