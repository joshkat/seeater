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
npm run e2e                   # Playwright: builds web, serves :4280, desktop Chrome + iPad WebKit
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

- **Self-hosting** (`docs/hosting.md`): `Dockerfile` (node:24-alpine build →
  `joseluisq/static-web-server` on `scratch`, ~13 MB, config `docker/static-web-server.toml`: SPA
  fallback, brotli, immutable `/assets`, no-cache shell). Build args `VITE_ENABLE_SYNC`,
  `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` (unset = local-only). `apps/api/Dockerfile`
  (build from the root) runs `prisma migrate deploy`, then the server, as `node`; it's ~150 MB
  compressed, mostly the Prisma CLI, which can't be trimmed (it loads Studio's deps eagerly).
  `scripts/deploy-zima.sh` streams the tree to the ZimaOS box (`josh@192.168.1.194`) and builds
  there. With no flag it runs the local-only container `seeater` on :8090. `--stack` runs
  `docker/compose.yml` (project `seeater`: web + api + postgres:17 in
  `/DATA/AppData/seeater/pg` + cloudflared). It's public at `https://$PUBLIC_HOST` via a
  Cloudflare Tunnel whose routes send `/api/*` → `api:4000` and the rest → `web:8080` (same
  origin). Secrets: `docker/.env` (gitignored, see `.env.example`) → copied to
  `/DATA/AppData/seeater/stack.env`. Postgres sits on an internal-only network; api has egress
  (Clerk fetches its JWKS).
  **On the box `DOCKER_CONFIG` is a temp dir**, which hides buildx: images must build with the
  legacy builder (no `COPY --chmod`, no heredocs). It also hides the compose plugin (the
  script links it back).
- Smoke-test the API in keyless mode with `curl -H "x-owner-id: dev-user" localhost:4000/api/events`.

## Conventions (important — user preference)

- **One component per file**; no monolithic files. Standard React (hooks, typed props,
  feature-based folders).
- **Style with DaisyUI/Tailwind classes**, not inline styles — so a new button is just
  `className="btn btn-primary btn-sm"`. Theme tokens: `bg-base-100/200/300`, `text-base-content`,
  `btn-primary/secondary/accent/error`, `badge-*`, `join`, `dropdown`, `card`, `rounded-box`.
  (Konva canvas nodes use Konva props, not CSS.)
- **Numbers use `components/NumberField`**, never `<input type="number">`: blank while typing,
  commits on blur/Enter/−/+ (blank → `emptyValue`, default `min`). Don't commit per keystroke:
  intermediate values (typing "12" passes "1") hit the document and can unseat guests.
- **No hidden modifier keys.** Anything reachable by ⌘/Shift-click must also have a visible control
  (e.g. the guest-list checkboxes). User feedback, 2026-10-09.
- **Every edit to an event is a pure op in `@seating/shared`** (with a test), applied via
  `useDocumentStore.getState().apply(doc => op(doc, …))`. Don't mutate documents anywhere else.
  One user action = one `apply` (compose ops inside it) so it's one undo step.
- **Global shortcuts skip only text entry** (`lib/isTextEntry`), not checkboxes/toggles/buttons.
- **Schema change?** Edit `document/schema.ts`. If old docs won't satisfy it, bump
  `EVENT_DOC_SCHEMA_VERSION` and add an upgrade step in `document/migrate.ts`.
- Storage access goes through `features/storage/repository/*` with `activeDb()`.

## Architecture notes

- **documentStore** (`editor/store/documentStore.ts`) holds the open `EventDoc`, the single source
  of truth while editing. `apply(op)` updates memory and schedules a save through a
  **coalescedWriter** (serialized, latest-wins). Local saves are immediate; there's no debounce
  and no Save button.
- **Undo/redo:** every `apply` is an undo step (`editor/lib/history.ts`, whole-doc snapshots, cap
  200, session-only — reset when another event opens or on reload; kept across the editor ↔
  check-in handover). Edits that fire per keystroke pass
  `apply(edit, { coalesceKey })` so a burst is one step (table names do). User-facing
  `undoEdit`/`redoEdit` (`editor/store/historyActions.ts`) also prune stale selections and close
  seating prompts; they're off while the placement dialog is open. **A user action must be one
  `apply`**, or it takes several ⌘Z to undo.
- **Notices** (`seatingFlowStore.showNotice(text, action?)`, rendered by `SeatingNoticeToast` over
  the canvas): anything undoable uses `showUndoNotice(text)` (`historyActions`), which adds an
  **Undo** button. Never write "Undo with ⌘Z" (tablets have no ⌘). Deleting tables or cutting
  chairs that unseats someone says who (`editor/lib/unseatNotices.ts`, shared `newlyUnseatedIds`).
- **Dialogs:** every modal calls `useModalFocus(ref, active?)` (`lib/useModalFocus.ts`) on its
  `.modal-box`: focus moves in, Tab is trapped (the hook moves focus itself; Safari's Tab skips
  buttons), focus returns to the trigger on close. New dialogs must use it.
- **Keyboard shortcuts** (`editor/hooks/useKeyboardShortcuts.ts`; the cheat sheet is
  `ShortcutsDialog` — keep the two in step):
  - Arrows nudge via `moveItems`, coalesced as `nudge:<ids>`; the step follows units
    (`lib/nudge.nudgeSteps`: 10/50 cm or 4″/20″).
  - ⌘/Ctrl+A/C/V select all, copy and paste. The clipboard is an in-memory `clipboardStore` (not the
    system clipboard), so paste works across layouts and events. C and V only `preventDefault` when
    there's something to copy or paste.
  - Arrows are ignored while a `<select>` or `<input>` has focus.
  - Visible equivalents (house rule): Select ▾ (`SelectMenu`: Select several = sticky toggle mode
    with box-drag, `editorStore.selectSeveral`; Select all; Clear), Copy and Paste (n)
    (`ClipboardButtons`; one copy path, `clipboardActions.copySelection`, which shows a notice).
- **Floor plan keyboard access** (`hooks/useCanvasKeyboard.ts`): the canvas is a focusable
  `group` "Floor plan, N tables"; Tab/Shift+Tab select tables then room objects (dashed
  `KeyboardFocusRing`), Enter opens Edit seating. The stage stays `invisible` until its first fit;
  a resize re-fits while the view is still the fitted one (else keeps the centre).
- **New items land on free floor** (shared `document/freeSpot.ts`: `findFreeSpot` scans the
  visible floor top-left first, footprint + `CHAIR_CLEARANCE`). A **grid** goes in the middle of
  the screen instead (`geometry/viewCenter.centerOfView`, kept on the floor); `addTableGrid`
  returns false when it overlaps something (the dialog then shows a notice).
- **Minimap** (`canvas/Minimap.tsx`, `geometry/minimap.ts`): SVG overlay, hidden while the whole
  floor fits. It draws with `RoomShapes` (shared with the template thumbnails).
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
- **Seating flow:** every way of seating guests (canvas drop, seat click, "Assign to table…") calls
  `guests/store/seatingFlowStore.requestSeating`. It asks before splitting a household
  (`householdSplits`), fills the table keeping households whole (`assignGuestsToTable`), and leaves
  leftovers **selected** under an overflow prompt (other tables / split here / add chairs / leave),
  looping until done. Prompts render in `guests/components/seating/SeatingPrompts` over the canvas.
  With **exact seat placement** on (`isExactSeatPlacement`: per-event `settings.exactSeatPlacement`
  auto/on/off, auto = ≤ 2 tables), a group opens the **placement dialog** instead of auto-filling.
- **Placement dialog** (`features/placement/`): working copy in `seatingFlowStore.placement`, edited
  only through the pure `lib/placementModel.ts`; Confirm = one `applySeatPlan` edit (Cancel drops
  it). SVG preview from `lib/previewGeometry.ts`. Also opened by double-click/double-tap on a table
  or "Edit seating" (either mode). Keyboard shortcuts are off while it's open (Escape backs out).
- **Drag and drop is pointer-based** (`features/dnd/`), not HTML5 DnD (which doesn't fire on touch):
  `beginPointerDrag` (mouse: after 5 px; touch: optional long-press — guest rows use 350 ms so the
  list scrolls), zones = `data-drop-zone="id"` + `registerDropZone(id, handler)`, `DragGhost` follows
  the pointer. Zones: `canvas` (Konva hit test → `requestSeating`), `placement-seat`,
  `placement-tray`.
- **Tablet layout:** below `xl` (1280px — every iPad orientation) the guest/properties panels are
  slide-over drawers (`editor/store/layoutStore`, `useDrawerState`; closed = `inert`). Canvas:
  pinch zoom + two-finger pan (`pinchViewport`), tap to (de)select. `@media (pointer: coarse)` in
  `global.css` makes every `.btn`/input ≥ 44px; guest-list columns widen via `pointer-coarse:`.
- **Toolbar by width:** `Toolbar` (sm and up) is one row: at `xl`+ it has Duplicate, Copy,
  Paste, ⌨ and Theme; below `xl` those (and Redo) go into Select ▾ and "⋯"
  (`ToolbarOverflowMenu`), rectangles into + Tables ▾, and ⌨ is dropped on coarse pointers
  (`COARSE_POINTER_QUERY`). The iPad portrait row has little slack: CI's Linux WebKit fonts are
  wider than macOS's, so `ux-toolbar.spec` can pass locally and fail in CI.
  **Exact seat placement lives in Properties (`EventSettings`) at every width**: the toolbar has
  no room for it at 1280px.
- **Phone layout** (below `sm`, 640px; `PHONE_QUERY` in `lib/useMediaQuery`): the header is ← and
  the title; `EditorPage` swaps the toolbar for `PhoneBottomBar` (Guests · + Add ▾ · Select ▾ ·
  Undo · ⋯ with Redo, Properties, History, Check-in, Export, Theme). Menus share item lists
  (`TableMenuItems`, `RoomObjectMenuItems`, `ExportMenuItems`, `ThemeMenuItems`). When a control **moves** between places, render it in one place via `useMediaQuery`
  rather than hiding a CSS copy: e2e `getByText` sees hidden copies, which breaks strict mode.
  The Guests drawer scrolls as a whole; a guest row keeps RSVP + actions on the name's line while
  the name gets 5rem, else they wrap below it.
- **Guest panel** (`GuestPanel`): counts, search (`GuestFilterBar`), then one row
  `+ Add guest · Import ▾ · Filters` (`GuestPanelActions`; the add form opens inline and keeps
  focus in Name). `AssignBar` renders only with a selection, as the `sticky bottom-0` last item
  of the list's scroll area (region "Selected guests"), so ticking never moves a row.
  `RsvpControl` is a radiogroup per guest (needs `guestName`).
- **Check-in (schema v9):** `guest.checkedInAt` (ISO or null). `setCheckedIn` also marks the RSVP as
  going, and duplicating an event clears check-ins. The `/events/:id/check-in` route
  (`features/checkin/`, lazy, no Konva) is a door list: search, table + seat per guest, "Check in
  all N" for a household, walk-ins (add + check in = one edit), seats from any layout. The editor
  and check-in share the open event through `editor/hooks/useOpenEvent`. When one route hands the
  event to the other, `open()` of the already-open event cancels the outgoing route's in-flight
  `close()` (tested in `editor/store/__tests__/documentStore.test.ts`).
- **Layouts (schema v5):** the **active** layout lives in the top-level `dimensions`/`tables`/
  `guest.seatId`, so every op and screen edits it unchanged; other layouts are in
  `doc.layouts[i].stored` (`{dimensions, tables, seating: guestId→seatId}`). `switchLayout` swaps
  them (one undoable edit). Anything that needs **all** layouts (export, stats across rooms) must use
  `layoutViews(doc)`, not `doc.tables`. Table/seat ids are unique across layouts. UI: tabs over the
  canvas (`editor/components/layouts/`, `editor/store/layoutActions.ts`).
- **Units & sizes (schema v6):** plan units are **centimetres**. `settings.units` is auto / metric
  / imperial (auto = locale, `editor/lib/units.ts`); inputs show whole cm or inches (tables) and
  m or ft (room). `TABLE_PRESETS` (shared `geometry/constants.ts`) are real furniture sizes;
  banquet/head tables use custom chair offsets (`sideSeatOffsets`). Shape `"row"` = chairs in a
  line with no table (ceremonies); `setSeatCount` resizes it.
- **Room objects & floor-plan image (schema v7):** `doc.objects` (dance floor, stage, bar,
  buffet, DJ, door, wall, label, area) and `doc.backdrop` ({imageId, opacity}) belong to the
  active layout (packed into `stored` like tables). Objects share the editor **selection** with
  tables (`selectedIds` holds both; delete/duplicate handle both; align moves tables only). The
  image bytes live in the `images` IndexedDB store, not the document; pruned on editor close
  unless the doc or a saved version references them (`imageCleanup.ts`).
- **Seating rules (schema v8):** `doc.rules` (`together` / `apart`, guest ids) apply to every
  layout; they only **warn** (`ruleProblems`, `newRuleProblems` → ⚠ on tables, "⚠ rule" under
  guests, a note in seating confirmations) and guide **auto-seat** (`autoSeat`: union-find groups of
  households + together rules, apart partners never share a table, optional group-by-tag; one
  `applySeatPlan`). UI in `features/rules/` and the action bar's More ▾ (also Swap seats).
- **Templates & onboarding:** `EVENT_TEMPLATES` (shared `templates.ts`) are plain functions that
  build tables/objects into a document. `createEventFromTemplate` makes a new event and
  `applyTemplate` replaces the active layout's room (guests stay, unseated by the new chairs). The
  ceremony + reception template makes two layouts. `createSampleEvent` is a 46-guest wedding with
  households, details, a rule and most guests seated. The web side lives in `features/templates/`:
  the New event dialog's "Start from" picker (SVG thumbnails rendered from the real template
  output), `EmptyRoomHint` over an empty floor, and `ApplyTemplateDialog` (one undo step). The
  empty dashboard has "Create your first event" and "Try a sample event".
- **Export & print** (`features/export/`): print views are a portal (`#print-view`) over the
  app; `body.printing` + `@media print` in `global.css` hide everything else, so the browser's
  Print / Save as PDF outputs only the sheet (no PDF library, works offline). The printed chart is
  SVG from the pure `chartScene(doc, layoutView, {showNames, color, includeDeclined})`, sized for
  a 7 × 8 in box (table names ≥ 10 pt); any layout can be printed (`printStore.layoutId`,
  `defaultPrintLayoutId`: cards default to the layout with the most tables). Legend swatches are
  SVG (browsers drop CSS backgrounds when printing). The PNG download still comes from the canvas
  via `registerChartCapture` (active layout).
  Lists are built from `seatingRows(doc, layoutView)` (pure). Guest CSV export uses headers the
  importer reads back. `PrintDocument({doc})` is the print view for any document; the editor's
  `PrintView` feeds it the open event. `ChartSvg` takes optional `viewBox`/`underlay`/`overlay`.
- **Viewer** (`features/viewer/`, route `/events/:eventId/view`, lazy, no Konva): a read-only
  page. `EventViewer({doc, banner?, images?, nav?})` is presentational (layout tabs, the print
  chart's SVG with pan/zoom, "Find your seat", Print ▾ via `PrintDocument`) and never touches
  `documentStore`, so it makes no saves or undo history; any source can feed it (share links,
  "Sam is editing"). `ViewerRoute` reads the local doc live (`useLiveQuery` + `getEventDoc`).
  Pan/zoom is pure math in `lib/chartViewport.ts` (view = centre + px per unit → viewBox) driven
  by `useChartViewport` (drag, wheel/trackpad pinch, two-finger pinch, arrows, + − Fit buttons).
  `findSeats` searches names only (no contact details/notes, as a link may be public) and leaves
  declined guests out; it opens on the layout with the most tables. The chart sits on white
  "paper" in every theme (its colours are the print ones).
- **Guest details (schema v4):** `meal`, `dietary`, `accessibility`, `notes`, `tags[]`, `isChild`.
  Meals/tags match existing spellings case-insensitively (`mealOptions`/`tagOptions` list them —
  no separate settings list). Edited in `guests/components/details/` (✎ on a row; Delete lives
  there too). Import reads them from headed columns.
- **Smart import** (`guests/components/import/`): picking a file opens the "Import guests" dialog
  (portalled to `body`, so the drawer can't clip it): a field per column, pre-filled from
  `lib/importFields.ts` (header aliases incl. common wedding-site names — not verified against
  real Zola/Knot/Joy files), First + Last name joined, RSVP column → `GuestInput.rsvpStatus`,
  likely duplicates (name match, case/space-insensitive) skipped by default and shown struck
  through in a preview of every row ("Import anyway"). Partner first/last columns add a second
  guest in the same household; "Type" maps to Child only when its values look like adult/child.
  Hand-picked columns survive the "First row is a header" toggle (`remapForHeader`). All logic is pure in
  `lib/importMapping.ts`; `rowsToGuests`/`parseGuestFile` use the same suggested mapping. Import =
  one `importGuests` call (one undo step).
- **Households (schema v2; v3 added `settings`):** `doc.households` (id + name) + `guest.householdId`. Ops drop empty
  households. The guest list groups unassigned members under a header (`guests/lib/guestListModel`,
  which also defines display order for Shift-click ranges and "Select next N").
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
- **Stored docs are upgraded on DB open:** the Dexie version is `DATABASE_VERSION` = store layout ×
  100 + `EVENT_DOC_SCHEMA_VERSION` (`storage/db/SeatingDb.ts`, currently 2 × 100 + 9 = 209). A schema bump **or**
  a store change (bump `STORE_LAYOUT_VERSION`) re-runs the upgrade, which re-declares the stores
  and runs `upgradeEventDoc` over every stored doc. Local reads don't go through `parseEventDoc`, so
  this is what keeps old local events loadable.
- **Trash:** dashboard "Move to trash" sets `record.trashedAt`; trashed events drop out of
  `listEventSummaries`/`getEventDoc`, are restorable at `/trash`, and are purged after 30 days
  (on dashboard/trash visit). `deleteEvent` is the permanent delete (also removes versions). Trash is
  local: sync pulls keep `trashedAt`.
- **Version history** (`features/versions/`, `versions` store): automatic versions on open + every
  10 min of edits (`useAutoVersions`; unchanged content skipped; newest 50 kept), named versions
  kept forever. Restore = save "Before restoring…" + one `apply(restoreEventDoc)` (undoable). Old
  versions go through `parseEventDoc`. Local only: not synced, not in backups.
- **Theme** persisted in `localStorage` and applied to `<html data-theme>` before React mounts
  (`lib/useTheme`; Theme ▾ on the dashboard and the editor). Contrast: helper text is
  `text-base-content/70` (never /40–/50), icon buttons /60, and success/error **text** uses
  `text-success-strong` / `text-error-strong` (`global.css`; per-theme shades). `:root` text
  follows `--color-base-content`.
- **Check-in search** (`checkin/lib/checkInList.ts`) covers everyone while a query is typed,
  whatever the filter; the walk-in is offered only when nobody matches. A check-in stays in place
  for 5 s (`useRecentCheckIns`). Page titles via `lib/useDocumentTitle`.

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
- **Playwright (`apps/e2e`):** WebKit refuses some ports (4190 = ManageSieve) with "Not allowed to
  use restricted network port" — that's why e2e uses 4280. Root `npm run e2e -- --flag` swallows
  flags (same as below); run `npx playwright test …` inside `apps/e2e`. Guest checkboxes ignore
  pointer events (their cell is the hit area): click `checkbox.locator("..")`. A closed drawer is
  `inert`, so it's absent from `getByRole` — open it first (`guestPanel()` helper).
  `E2E_PORT=4281 npx playwright test` runs a second checkout's suite side by side (each port
  reuses whatever server is already on it, so never share a port between checkouts). Use
  `editorTools(page)` (top toolbar, or the phone's bottom bar) and `exactPlacementToggle(page)`.
  Notices have an "Undo" button too: scope with `getByRole("status")` or the toolbar, and use
  `exact: true` for names like "Select all" / "Copy" (an event title can contain them).
- **The built-in browser pane, when hidden, runs no `requestAnimationFrame`:** the canvas stays
  invisible (it waits for its first fit) and drawers don't open until a screenshot forces a
  frame. That's the pane, not the app.
- **A fresh worktree's `npm run typecheck` fails in `apps/api`** without `DATABASE_URL` (the API's
  `.env` is gitignored and `prisma.config.ts` needs it). Any value works for typechecking.
- **Passing Vite flags through npm:** use `npm run dev --workspace @seating/web -- --port N`. Going
  via the root `dev:web` script swallows the flags.
- **Plain HTTP on a LAN IP is not a secure context:** no `crypto.randomUUID`,
  `navigator.clipboard` or service worker. `newId` falls back to `getRandomValues` and
  `lib/copyText` to `execCommand`; use those, never the raw APIs. The PWA/offline install needs
  HTTPS (or localhost).
- **Service worker only in production builds.** To test offline, build and run `web-preview`.
  Unregister the SW afterwards if it confuses later preview runs.
- **StrictMode double-mounts** `EditorRoute`: `documentStore.open()` is idempotent and `close()` is
  guarded by a request counter. Keep it that way.
- **ResizeObserver** in `EditorCanvas` defers `setStageSize` via `requestAnimationFrame` so opening
  DevTools doesn't trip the "ResizeObserver loop" error.
- **CORS (dev):** API allows any `localhost` origin in non-production (`apps/api/src/app.ts`).
- **Synthetic clicks on Konva** are unreliable. For verification, drive real DOM events or store
  actions, or dispatch pointer events at a node's `getAbsolutePosition()`. In dev, `window.Konva` exists:
  `Konva.stages[0].find(n => n.getAttr('tableId'))` gives table bodies; `group.fire('click' |
'dblclick', { evt: new MouseEvent(…) }, true)` selects / opens seating. **Guest drags** are
  `PointerEvent`s: `pointerdown` on the row (`li.cursor-grab` — not the household's wrapper `li`),
  then `pointermove`/`pointerup` on `window`; with `pointerType: "touch"` wait > 350 ms before
  moving. Pinch = `TouchEvent`s with two `Touch`es on `stage.content`. New tables from the toolbar
  only jitter by 24 units, so they overlap and the topmost wins the hit test.
- **Touch emulation in the preview browser** (and so `pointer: coarse`) only kicks in below 768px
  wide; check iPad layouts at 820×1180 / 1180×820 for drawers and at 767px for touch sizing.
- **`pointer-coarse:` beats `max-sm:`** in Tailwind's generated order. A phone override of a touch
  width needs `!` (`max-sm:w-auto!`; see `guests/lib/guestColumns.ts`). e2e: the `iphone` project
  runs only `phone.spec.ts`, and the other projects ignore it.
- **DaisyUI `dropdown-content` must not carry a display utility** (`flex`, `grid`…): DaisyUI hides
  a closed dropdown with `display: none`, and the utility overrides it, leaving an invisible
  (opacity 0) panel that swallows clicks. Put layout classes on an inner wrapper.
- **Controlled `<select>`s (AssignBar) ignore `form_input`.** Set the value with the native
  `HTMLSelectElement` value setter and dispatch a bubbling `change` event.
- **HMR on a zustand store module** can leave components bound to two store instances (a prompt
  "doesn't appear"). Reload the page before concluding it's a bug.
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
- Guest seating: add, **import CSV + XLSX** (xlsx lazy-loaded; column-mapping dialog with
  preview, first/last name, RSVP, duplicate skipping), drag-to-seat, **multi-select
  (checkboxes + select-all, ctrl/cmd-click, Shift-click ranges, "Select next N") +
  assign-to-table**, labelled list columns, click-to-assign,
  occupancy initials on chairs.
- **Bulk seating:** overflow prompt (leftovers stay selected; pick another table with open-seat
  counts, split a household into the seats left, **add chairs** to this table, or leave them).
- **Households:** `householdId` (schema v2), grouped in the list (header selects / drags the whole
  household, rename, ungroup), "Group as household" from a selection, import from a
  "Household"/"Party" column, never split without asking.
- **Exact seat placement** (per event, schema v3): toggle in Properties (auto = on for ≤ 2 tables);
  placement dialog with live table preview, tap or drag, swap/replace asks first, Confirm = one
  change; "Edit seating" / double-click a table.
- **Tablet & touch:** touch drag-and-drop (long-press), pinch/two-finger pan/tap, drawers below
  1280px, 44px targets on touch screens. **Phones:** compact header/toolbar, scrolling guest
  drawer with wrapping rows.
- **Read-only viewer:** `/events/:id/view` — chart with pan/zoom, layout tabs, find your seat
  (highlights the table and chair), print views. Not linked from the UI yet (sharing will).
- **Day-of check-in:** a door list per event (search, table + seat, household check-in, walk-ins,
  arrivals count, undo), phone-first. Search finds arrived guests; check-ins confirm in place.
- **UX pass (2026-10):** nothing unseats silently (Undo notices), visible Select ▾ / Copy / Paste,
  free-floor placement, compact guest panel, phone bottom bar, one-row iPad toolbar, focus-trapped
  dialogs, keyboard floor plan, WCAG AA contrast in every theme, partner import, vector print
  chart for any layout.
- **Undo/redo:** ⌘/Ctrl+Z, Shift+⌘/Ctrl+Z or Ctrl+Y, toolbar ↶ ↷. Typing a name is one step; the
  placement dialog's Confirm is one step. Session-only (not kept across reloads).
- **Keyboard & navigation:**
  - arrow-key nudge (Shift = further);
  - select all, copy / paste (across layouts and events), duplicate, delete;
  - `?` / ⌨ cheat sheet;
  - minimap while zoomed in.
- **Version history:** "History" in the editor: automatic (on open, every 10 min) + named versions;
  restore (undoable), copy as new event, delete.
- **Trash:** "Move to trash" with Undo; `/trash` restore / delete forever / empty; 30-day purge.
- **End-to-end tests:** Playwright, desktop Chrome + iPad Pro 11 WebKit (portrait/landscape), in CI.
- **Guest details:** meal, dietary/allergies, accessibility, notes, tags, child — dialog (✎),
  shown under each guest, imported from CSV/XLSX columns.
- **Multiple layouts:** tabs over the canvas (ceremony, reception…); blank / copy tables / copy
  tables + seating; shared guest list, separate seating.
- **Find & stats:** guest search + filters (RSVP, seated, tag, meal, needs), "Show on map" (rings
  the chair), totals line, seated/chairs on each table, Stats dialog with per-table meal totals and
  "Copy for caterer"; colour chairs by guest / tag / meal / RSVP with a legend.
- **Room setup:** real-size presets (rounds, banquet, head tables, chair rows), grid of tables,
  align/distribute, units (auto/metric/imperial) and room size; room objects (dance floor, stage,
  bar, buffet, DJ, doors, walls, labels, areas); a floor-plan image to trace over.
- **Seating rules & auto-seat:** keep together / keep apart (warnings everywhere, rules dialog),
  auto-seat (households, rules, optional by tag), swap two guests.
- **Templates & onboarding:** start from a blank room or one of six templates (wedding reception,
  ceremony, ceremony + reception, gala, dinner party, talk); apply a template to an empty room; a
  sample wedding to explore.
- **Export & print:** seating chart (print or PNG), table rosters, find-your-seat board, fold-over
  place cards, escort cards (Print / Save as PDF), guest list CSV with seats per layout.
- **RSVP** marking (pending/going/declined): segmented control; declined guests struck through +
  red-ringed/dimmed chair.
- **Multi-event dashboard:** create / open / rename (inline) / **duplicate (layout ± guests ±
  assignments)** / move to trash. Editor has "← Events" + editable title.
- **Theming** (light / dark / black / synthwave) persisted to localStorage.
- **Local-first:** IndexedDB storage, no account needed, **offline + installable (PWA)**, URL
  routing, **backup download/import**.
- **Optional sign-in (Clerk) with multi-device sync**: versioned whole-document sync, "keep
  both" conflicts, signed-out events adopted on sign-in. **Built but disabled** (`VITE_ENABLE_SYNC`).
- **Hardening:** ESLint + Prettier check + GitHub Actions CI; API rate limiting + helmet;
  patched SheetJS; code-split editor and Clerk. **Current majors:** React 19, Vite 8, Vitest 5,
  Prisma 7, zod 4, ESLint 10 (TypeScript stays 5.x until typescript-eslint supports 7).

Dropped: sending invites from the platform (RSVP is manual marking only).

Roadmap order (2026-10-09): 1 bulk seating ✅ → 2 exact seat placement ✅ → 3 tablet/touch ✅
(PR #7) → **Phase A ✅** (4 undo/redo, 12 version history + trash, Playwright e2e) → **Phase B ✅**
(13 multiple layouts — shared guests, separate tables + seating; 6 guest details) → **Phase C ✅**
(7 search/filter + show on map, 8 live stats, 21 colour-coding) → **Phase D ✅** (5 export/print).
**E ✅** (17 align/distribute + grid, 18 units + presets, chair rows, 9 room objects, 10
floor-plan image) → **F ✅** (11 seating rules, 20 auto-seat + swap). → **G ✅** (14 onboarding + sample event, 22 smart import, 25 templates) → **H ✅** (15 phone
layout, 24 check-in; 23 QR / 26 Wallet need hosting — parked with sync). → **I ✅**
(16 shortcuts, 19 minimap). → **UX pass** (`docs/ux-review.md`, review guide
`docs/reviewing-ux-pass.md`; owner decisions D1–D7 there are still open). Next: the owner's
decisions on D1–D7. Deferred on purpose: **error reporting**
(Sentry or an "email us" link) and **re-enabling sign-in + sync**.

## Git

- Commit after each feature. Remote: `origin`
  (github.com/joshkat/seeater; renamed from `custom-seating-app` on 2026-10-26, which GitHub
  still redirects, and still the name of the local folder).
