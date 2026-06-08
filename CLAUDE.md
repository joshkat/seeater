# CLAUDE.md

Onboarding + living documentation for the **event seating-chart builder**. Keep this
current: update **Feature status**, **Architecture**, and **Gotchas** whenever a feature lands.

## What this is

A web app (with a mobile-portable API) for building event seating charts — Ticketmaster-style
visual seating, but for weddings/large venues with tables that have configurable chairs. Users
lay out tables, manage a guest list, and seat guests. A `FloorPlan` is the user-facing **"event"**
(name + tables + a 1:1 default "Guest list" `Event` holding its guests).

## Stack & layout

npm-workspaces monorepo:

- `packages/shared` (`@seating/shared`) — domain **types + seat geometry**; the contract between
  API and web. ESM, builds to `dist/`. **Run `npm run build:shared` after editing.**
- `apps/api` (`@seating/api`) — **Fastify 5 + TypeScript (ESM)**, **Prisma + PostgreSQL**, zod
  validation. Feature modules under `src/modules/<feature>/{*.routes,*.service,*.schema}.ts`,
  shared mappers in `src/lib/mappers.ts` (Prisma rows → shared DTOs).
- `apps/web` (`@seating/web`) — **React 18 + Vite**, **react-konva** canvas, **zustand** stores,
  **Tailwind v4 + DaisyUI** styling. Feature folders: `src/features/{editor,guests,dashboard}/`.

## Run & verify

```bash
# Postgres must be running (see Gotchas)
npm run build:shared          # after any shared change
npm run dev:api               # API on :4000  (tsx watch; run from repo root)
npm run dev:web               # web on :5173
npm run typecheck             # all workspaces
npm run build --workspace @seating/web   # prod build
```

- API auth is a dev placeholder: owner id comes from `x-owner-id` header, default `dev-user`
  (`apps/api/src/lib/auth.ts`). Clerk is deferred.
- Verify in the browser preview; smoke-test the API with `curl -H "x-owner-id: dev-user"`.

## Conventions (important — user preference)

- **One component per file**; no monolithic files. Standard React (hooks, typed props,
  feature-based folders).
- **Style with DaisyUI/Tailwind classes**, not inline styles — so a new button is just
  `className="btn btn-primary btn-sm"`. Theme tokens: `bg-base-100/200/300`, `text-base-content`,
  `btn-primary/secondary/accent/error`, `badge-*`, `join`, `dropdown`, `card`, `rounded-box`.
  (Konva canvas nodes use Konva props, not CSS.)
- Shared types live in `@seating/shared` and are imported by both ends.

## Architecture notes

- **Stores (zustand):** `editor/store/editorStore` (active plan: tables, viewport, zoom/focus,
  autosave), `guests/store/guestStore` (guest list, selection, seat assignment), and
  `dashboard/store/navStore` (`view: dashboard | editor`, `openEvent`, `goToDashboard`).
- **Autosave:** per-table debounced PATCH via `editor/store/persistQueue`. No Save button.
- **Seat geometry:** pure functions in `@seating/shared` (`resolveSeatPositions`, auto layouts).
  Editor viewport math (fit / focus / zoom / clamp) in `editor/geometry/viewport.ts`.
- **Events ↔ plans:** each FloorPlan has a get-or-create default `Event` (`GET /floor-plans/:id/
  event`). Guests belong to that event. `GET /floor-plans/summaries` powers the dashboard;
  `POST /floor-plans/:id/duplicate` clones a plan (layout always; guests/assignments opt-in).
- **One guest per seat** enforced by `Guest.seatId @unique`; assigning to an occupied seat
  **displaces** the previous occupant (API returns all affected guests).
- **Theme** persisted in `localStorage` and applied to `<html data-theme>` before React mounts
  (`web/src/lib/theme.ts`, called in `main.tsx`).

## Gotchas (these cost real time — read before debugging)

- **Postgres (local, macOS/Homebrew):** superuser is **`Josh`**, not `postgres`. DB `seating_app`,
  `DATABASE_URL=postgresql://Josh@localhost:5432/seating_app?schema=public`. If the API throws
  Prisma **P1001**, the service stopped → `brew services restart postgresql@14`. Don't
  `cp .env.example .env` (its `postgres:postgres` placeholder clobbers the working value).
- **Vite + react-konva:** after installing ANY new dependency, the canvas may crash in `<StageWrap>`
  (stale optimize cache / duplicate React) — fix: `rm -rf node_modules/.vite` and restart the dev
  server. `vite.config.ts` already sets `resolve.dedupe: ['react','react-dom']`. **Do NOT add
  `react`/`react-dom` to `optimizeDeps.include`** — it triggers an "Outdated Optimize Dep" reload
  loop (blank page). Only `react-konva`/`konva` belong there.
- **Seat re-sync preserves identity:** when seats change (mode toggle, chair move, count change),
  the API reconciles seats **by index** (update in place, keep ids) instead of delete+recreate —
  this is what keeps seated guests put (`apps/api/src/modules/tables/table.service.ts`).
- **ResizeObserver** in `EditorCanvas` defers `setStageSize` via `requestAnimationFrame` so opening
  DevTools doesn't trip the "ResizeObserver loop" error.
- **CORS (dev):** API allows any `localhost` origin in non-production (`apps/api/src/app.ts`).
- **Synthetic clicks on Konva** are unreliable; for verification, drive real DOM events or store
  actions, or dispatch pointer events at a node's `getAbsolutePosition()`.

## Feature status

Done:
- Visual editor: round/rectangle tables, auto + custom chairs, drag/snap/rotate/resize,
  multi-select, duplicate/delete, **bounds clamping**, autosave.
- **Zoom-to-table** on select; zoom controls (+/−/reset), recenter on table resize, reset =
  re-fit to current viewport.
- Guest seating: add, **import CSV + XLSX** (xlsx lazy-loaded), drag-to-seat, **multi-select
  (ctrl/cmd-click) + assign-to-table**, click-to-assign, occupancy initials on chairs.
- **RSVP** marking (pending/going/declined) — segmented control; declined guests struck through +
  red-ringed/dimmed chair.
- **Multi-event dashboard:** create / open / rename (inline) / **duplicate (layout ± guests ±
  assignments)** / delete (cascades event+guests). Editor has "← Events" + editable title.
- **Theming** (light / dark / black / synthwave) persisted to localStorage.

Dropped: sending invites from the platform (RSVP is manual marking only).

Next candidates: **export/print** (chart PNG/PDF + per-table roster), **venue templates**
("popular venues" gallery), **Apple/Google Wallet passes** (needs Apple Dev Program + Google
Cloud — start account setup early).

## Git

- Commit after each feature; messages end with `Co-Authored-By: Claude Opus 4.8
  <noreply@anthropic.com>` (author stays the user). Remote: `origin`
  (github.com/joshkat/custom-seating-app).
