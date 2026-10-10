# CLAUDE.md

Onboarding + living documentation for the **event seating-chart builder**. Keep this
current: update **Feature status**, **Architecture**, and **Gotchas** whenever a feature lands.

## What this is

A **local-first** web app for building seating charts (weddings, galas, or a two-table dinner).
Users lay out tables with configurable chairs, manage a guest list, and seat guests. Each **event**
is one JSON document stored in the browser's IndexedDB. The app works offline with no account.
Optional sign-in (Clerk) + sync to a small Postgres-backed API is built but **switched off**: the
product ships local-only. It only runs with `VITE_ENABLE_SYNC=true` (decision: re-enable later).

## Stack & layout

npm-workspaces monorepo:

- `packages/shared` (`@seating/shared`): **the contract.** The zod schema for the event document
  (types inferred from it), **pure edit ops** (`document/*Ops.ts`), `parseEventDoc` (upgrade +
  validate untrusted input), seat geometry, and sync wire types. ESM, builds to `dist/`. **Run
  `npm run build:shared` after editing.**
- `apps/web` (`@seating/web`): **the product.** React 19 + Vite 8, react-konva, zustand, React
  Router, Dexie (IndexedDB), vite-plugin-pwa, Tailwind v4 + DaisyUI, optional Clerk. Features:
  `src/features/{storage,editor,guests,dashboard,backup,auth,sync}/`.
- `apps/api` (`@seating/api`): **optional sync service.** Fastify 5 + Prisma + Postgres. One module
  (`modules/events`) and one table (`EventDocument`). Compare-and-swap writes on `version`.

Docs: `docs/architecture.md` (start), `docs/data-model.md`, `docs/sync.md`,
`docs/reviewing-local-first.md`.

## Run & verify

```bash
npm run build:shared          # after any shared change
npm run dev:web               # web on :5173 — needs nothing else
npm run typecheck             # all workspaces
npm run lint                  # ESLint (typescript-eslint + react-hooks incl. compiler rules)
npm run format:check          # Prettier check
npm test                      # shared + web (Node, fake-indexeddb) + api (needs Postgres)
# Sync (optional):
npm run db:up                 # Postgres 17 in Docker
npm run dev:api               # API on :4000
```

**CI** (`.github/workflows/ci.yml`) runs all of the above on every PR + push to main (Postgres
service container), plus both production builds. Run `npm run lint && npm run format:check` before
pushing.

Preview configs (`.claude/launch.json`): `web` :5173 (uses `.env.local`; sync off unless
`VITE_ENABLE_SYNC=true` there), `web-keyless` :5174 (Clerk forced off), `api` :4000, `web-devsync`
:5175 (`VITE_ENABLE_SYNC=true` + keyless `VITE_DEV_SYNC_OWNER=dev-user`, syncs to the local API),
`web-preview` :4173 (prod build, service worker active).

- Smoke-test the API in keyless mode with `curl -H "x-owner-id: dev-user" localhost:4000/api/events`.

## Conventions (important — user preference)

- **One component per file**; no monolithic files. Standard React (hooks, typed props,
  feature-based folders).
- **Style with DaisyUI/Tailwind classes**, not inline styles — so a new button is just
  `className="btn btn-primary btn-sm"`. Theme tokens: `bg-base-100/200/300`, `text-base-content`,
  `btn-primary/secondary/accent/error`, `badge-*`, `join`, `dropdown`, `card`, `rounded-box`.
  (Konva canvas nodes use Konva props, not CSS.)
- **Every edit to an event is a pure op in `@seating/shared`** (with a test), applied via
  `useDocumentStore.getState().apply(doc => op(doc, …))`. Don't mutate documents anywhere else.
- **Schema change?** Edit `document/schema.ts`. If old docs won't satisfy it, bump
  `EVENT_DOC_SCHEMA_VERSION` and add an upgrade step in `document/migrate.ts`.
- Storage access goes through `features/storage/repository/*` with `activeDb()`.

## Architecture notes

- **documentStore** (`editor/store/documentStore.ts`) holds the open `EventDoc`, the single source
  of truth while editing. `apply(op)` updates memory and schedules a save through a
  **coalescedWriter** (serialized, latest-wins). Local saves are immediate; there's no debounce
  and no Save button.
- **editorStore** = view state only (viewport, focus, selection). **guestStore** = guest selection
  only. Both expose actions that wrap shared ops. Components read via
  `editor/hooks/useDocumentSelectors.ts` (`useTables`, `useGuests`, …).
- **Routing:** `/` dashboard (Dexie `useLiveQuery`), `/events/:eventId` → `EditorRoute`
  (open on mount, close on unmount).
- **Storage scopes:** one IndexedDB database per identity: `seating-local` (signed out) and
  `seating-account-<userId>`. `storageStore.activate(scope)` switches them.
  `sync/engine/accountSession.ts` wires identity → database → sync and is started in `main.tsx`
  **before render**. Signing in moves signed-out events into the account (`adoptEvents`).
- **Sync:** `sync/engine/planSync.ts` is the whole conflict policy (a pure decision table; "keep
  both" on concurrent edits). `runSync.ts` executes it. Local writes from sync are compare-and-set
  on `updatedAt` (`storage/repository/syncRepository.ts`). Triggers: sign-in, focus/online, every
  60 s, and 1.5 s after any record goes dirty.
- **Seat identity:** chair edits reuse seat ids by index (`tableOps.buildSeats`), so seated guests
  stay put. Shrinking or deleting unseats orphans in the same op.
- **One guest per seat:** enforced by shared ops and by `eventDocSchema` integrity (also checked on
  API upload).
- **Sync flag:** `auth/lib/authConfig.ts` → `syncEnabled` (`VITE_ENABLE_SYNC === "true"`) gates
  `clerkPublishableKey` and `devSyncOwner`; everything downstream keys off those. Clerk is
  lazy-loaded (`main.tsx` → `AuthRoot`, `AuthControls` → `ClerkAccountButtons`) so it's not in the
  bundle when off. Copy that mentions accounts checks `syncConfigured`.
- **Code-splitting:** `/events/:eventId` is a React Router `lazy` route (editor + Konva in their
  own chunk); `xlsx` is a dynamic import.
- **API hardening:** `@fastify/helmet` (CORP `cross-origin`), `@fastify/rate-limit`
  (`RATE_LIMIT_MAX`/min per IP, `/api/health` exempt), `TRUST_PROXY` for real client IPs.
- **Auth (Clerk), optional:** no gate. `AuthRoot` = `<ClerkProvider>` + `<ClerkIdentityBridge>`
  (pushes userId to `identityStore`, registers `getToken` for `apiClient`). `AuthControls` shows
  "Sign in to sync" or the avatar. API: `clerkPlugin` only when `CLERK_SECRET_KEY` is set;
  `lib/auth.ts` resolves the owner. Clerk theming via `auth/lib/clerkAppearance` +
  `useClerkAppearance` is unchanged.
- **Offline:** the PWA precaches the app shell (`vite.config.ts`); `navigator.storage.persist()` is
  requested on first event creation; backups are `<name>.seating.json` (`features/backup`).
- **Theme** persisted in `localStorage` and applied to `<html data-theme>` before React mounts.

## Gotchas (these cost real time — read before debugging)

- **Postgres is Docker now:** `npm run db:up` (docker-compose, `seating:seating@localhost:5432/
seating_app`). Homebrew Postgres is gone from this machine. Prisma **P1001** means the
  container isn't running. Only the sync API needs a database; the web app never does.
- **IndexedDB is per origin:** each dev port (5173/5174/5175/4173) has separate data. "My events
  vanished" usually means a different port or a different identity scope.
- **Node:** 22.12+, 24 or 26+ (Vitest 5's range; Node 23/25 unsupported). CI uses 24.
- **One React for the whole repo:** root `package.json` `overrides` pins `react`/`react-dom`
  (Clerk's packages otherwise keep React 18 hoisted at the root → duplicate React). When bumping
  React, change the override and `apps/web` deps together, then check `npm ls react` shows one
  version.
- **Vite + react-konva:** after installing ANY new dependency, the canvas may crash in `<StageWrap>`
  (stale optimize cache / duplicate React). Fix: `rm -rf node_modules/.vite apps/web/node_modules/.vite`
  and restart the dev server. `vite.config.ts` already sets `resolve.dedupe: ['react','react-dom']`.
  **Do NOT add `react`/`react-dom` to `optimizeDeps.include`**: it triggers an "Outdated Optimize
  Dep" reload loop (blank page). Only `react-konva`/`konva` belong there.
- **Passing Vite flags through npm:** use `npm run dev --workspace @seating/web -- --port N`. Going
  via the root `dev:web` script swallows the flags.
- **Service worker only in production builds.** To test offline, build and run `web-preview`.
  Unregister the SW afterwards if it confuses later preview runs.
- **StrictMode double-mounts** `EditorRoute`: `documentStore.open()` is idempotent and `close()` is
  guarded by a request counter. Keep it that way.
- **ResizeObserver** in `EditorCanvas` defers `setStageSize` via `requestAnimationFrame` so opening
  DevTools doesn't trip the "ResizeObserver loop" error.
- **CORS (dev):** API allows any `localhost` origin in non-production (`apps/api/src/app.ts`).
- **Synthetic clicks on Konva** are unreliable. For verification, drive real DOM events or store
  actions, or dispatch pointer events at a node's `getAbsolutePosition()`.
- **Sync is off by default.** If sign-in/sync "doesn't show up", that's `VITE_ENABLE_SYNC` unset —
  intended. Don't remove the flag or the gated code; it's deliberately parked.
- **xlsx comes from SheetJS's CDN tarball** (`cdn.sheetjs.com/xlsx-0.20.3`), not npm — the npm
  package is abandoned with open advisories. Upgrade by changing that URL.
- **`npm audit` is at 0** (including dev tools) and CI fails on any high/critical advisory
  (`npm audit --audit-level=high`). A new upstream advisory can turn CI red with no code change —
  fix it (bump / override) rather than lowering the level.
- **Security overrides for the Prisma CLI:** root `overrides` also pins `deepmerge-ts@8.0.2` and
  `mysql2@3.24.5`. Every Prisma 6.13+/7.x/8-RC CLI pins vulnerable versions of both (dev-only; the
  runtime client/adapter aren't affected). Verified the CLI works with them (validate, generate,
  migrate status/deploy/diff, format). **On each Prisma bump, delete these two overrides and
  re-run `npm audit`** — drop them once Prisma ships patched versions. If npm reports an override
  as "invalid", run `npm update <pkg>` (removing lockfile entries makes npm drop the package).
- **Clerk keys live in real env files, not `.env.example`.** Web: `apps/web/.env.local`
  (`VITE_CLERK_PUBLISHABLE_KEY`). API: `apps/api/.env` (`CLERK_SECRET_KEY`). Restart after changing
  them. Without a secret key, the API trusts `x-owner-id` (dev only).
- **Prisma 7:** the client is generated as TS into `apps/api/src/generated/prisma` (gitignored) —
  import `PrismaClient`/`Prisma` from there, not `@prisma/client`. The runtime connects via the
  `@prisma/adapter-pg` driver adapter (`plugins/prisma.ts`). The CLI reads
  `apps/api/prisma.config.ts` (DATABASE_URL), so run Prisma via the npm scripts (they run in
  `apps/api`), not `npx prisma --schema …` from the root. `dev`/`typecheck`/`build` regenerate the
  client first. npm's `latest` tag for `prisma` is an 8.0 RC — pin stable versions explicitly.
- **API tests hit the real database** in `DATABASE_URL`, using random `test-…` owner ids that are
  cleaned up afterwards.

## Feature status

Done:

- Visual editor: round/rectangle tables, auto + custom chairs, drag/snap/rotate/resize,
  multi-select, duplicate/delete, **bounds clamping**, autosave.
- **Zoom-to-table** on select; zoom controls (+/−/reset), recenter on table resize, reset =
  re-fit to current viewport.
- Guest seating: add, **import CSV + XLSX** (xlsx lazy-loaded), drag-to-seat, **multi-select
  (ctrl/cmd-click) + assign-to-table**, click-to-assign, occupancy initials on chairs.
- **RSVP** marking (pending/going/declined): segmented control; declined guests struck through +
  red-ringed/dimmed chair.
- **Multi-event dashboard:** create / open / rename (inline) / **duplicate (layout ± guests ±
  assignments)** / delete. Editor has "← Events" + editable title.
- **Theming** (light / dark / black / synthwave) persisted to localStorage.
- **Local-first:** IndexedDB storage, no account needed, **offline + installable (PWA)**, URL
  routing, **backup download/import**.
- **Optional sign-in (Clerk) with multi-device sync**: versioned whole-document sync, "keep
  both" conflicts, signed-out events adopted on sign-in. **Built but disabled** (`VITE_ENABLE_SYNC`).
- **Hardening:** ESLint + Prettier check + GitHub Actions CI; API rate limiting + helmet;
  patched SheetJS; code-split editor and Clerk. **Current majors:** React 19, Vite 8, Vitest 5,
  Prisma 7, zod 4, ESLint 10 (TypeScript stays 5.x until typescript-eslint supports 7).

Dropped: sending invites from the platform (RSVP is manual marking only).

Next candidates: **undo/redo** (cheap now: history of immutable docs in `documentStore`), **export/print**
(chart PNG/PDF + per-table roster), **venue templates** (a template is just a document),
touch-friendly seating, **Apple/Google Wallet passes**. Deferred on purpose: **error reporting**
(Sentry or an "email us" link) and **re-enabling sign-in + sync**.

## Git

- Commit after each feature. Remote: `origin`
  (github.com/joshkat/custom-seating-app).
