# Reviewing the local-first migration

A guide for auditing the PR that moves the app from **server-first** (every edit is an API call
into normalized Postgres tables) to **local-first** (the browser is the database; sign-in adds
optional sync). It covers what changed, the order to read it in, what to scrutinize, how to test
it yourself, and what's deliberately left out.

> **Size, honestly:** ~10.8k lines added and ~4.4k removed, but most of that is
> `package-lock.json`. Excluding the lockfile, tests and icons, it's about **3.0k added / 2.6k
> removed** across ~110 files, plus ~1.1k lines of tests.

---

## Before → after

```mermaid
flowchart LR
  subgraph Before
    direction TB
    W1["Web (React)"] -- "PATCH per table,<br/>POST per guest,<br/>PUT per seat" --> A1["API: floorPlans, tables,<br/>events, guests modules"]
    A1 --> P1[("Postgres<br/>FloorPlan · Table · Seat<br/>Event · Guest · Venue")]
    G1["Sign-in gate<br/>(required when Clerk on)"] --> W1
  end
  subgraph After
    direction TB
    W2["Web (React)"] -- "every edit" --> I2[("IndexedDB<br/>1 JSON doc / event")]
    I2 <-. "only if signed in:<br/>whole-doc, versioned" .-> A2["API: events module<br/>(sync only)"]
    A2 --> P2[("Postgres<br/>EventDocument")]
    S2["Service worker<br/>(offline app shell)"] --- W2
  end
```

What a user notices:

- No sign-in wall. The app works immediately, offline too, and can be installed.
- "Sign in to sync" backs everything up and syncs across devices. Events made signed out are
  carried into the account.
- Real URLs (`/events/:id`): refresh, back button and deep links work.
- Download / import backup per event.

---

## Review order (commit by commit)

The commits are meant to be read in order. Each says what it does and why in its message.
**Intermediate commits aren't individually runnable.** The shared contract changes in commit 1
and the web app catches up in commits 3–4. Each commit does typecheck for the packages it touches,
and the branch tip passes everything.

### 1. `feat(shared): event document schema, migrations and pure edit operations`

**Scrutinize. This is the heart of it.**

- `packages/shared/src/document/schema.ts`: is anything missing from the document? Are the limits
  sane?
- `integrity.ts`: the invariants every stored document must satisfy.
- `tableOps.ts` and `guestOps.ts`: every edit the editor can make. Check that:
  - `buildSeats` reuses ids by index (this is what keeps seated guests put);
  - `setSeatCount` and `deleteTables` call `unseatOrphans`;
  - `assignSeat` displaces the previous occupant;
  - `assignGuestsToTable` packs groups the same way the old client did.
- `migrate.ts`: `parseEventDoc` is the only door for untrusted input (sync pulls, backup files).
- Tests: `document/__tests__/*` (30).

### 2. `feat(api): replace relational CRUD with a versioned event-document sync API`

**Scrutinize the service. Skim the deletions.**

- `apps/api/src/modules/events/event.service.ts`: `put()` and `remove()` are compare-and-swap via
  `updateMany … WHERE version = base`. Can two concurrent writers both win? (They shouldn't: one
  matches the row, the other gets `count === 0` and a 409.)
- `prisma/schema.prisma`: the composite `(ownerId, id)` primary key is the tenant isolation.
- `event.routes.ts`: 5 MB body limit; the body `id` must match the URL `id`.
- `app.ts`: the error handler now hides 5xx details in production.
- The old migrations are **replaced** by one baseline. That's safe only because no deployed
  database exists (and the local one was gone). Flag it if that's not true for you.
- Tests: `modules/events/__tests__/event.routes.test.ts` (7, against real Postgres).

### 3. `feat(web): IndexedDB storage layer for event documents`

- `features/storage/db/SeatingDb.ts`: the record shape (doc + summary + sync meta).
- `repository/eventRepository.ts`: note `deleteEvent` (hard delete vs tombstone) and `saveEventDoc`
  (refuses to write over a tombstone).
- `repository/coalescedWriter.ts`: small but critical. Writes are serialized and latest-wins per
  key.

### 4. `refactor(web): editor and guest panel edit the local event document`

**The biggest UI diff, mostly mechanical.**

- `features/editor/store/documentStore.ts`: `apply(op)` is the only way the open event changes.
- `editorStore.ts` and `guestStore.ts`: lost their data and their async code. Actions are now
  one-liners over shared ops.
- Components: the store reads became `useTables()` / `useGuests()`. `async`/`void` dropped
  everywhere.
- Deleted: `floorPlanApi.ts`, `guestApi.ts`, `persistQueue.ts`, `syncAssignments`, the health
  scaffold.

### 5. `feat(web): URL routing with React Router`

- `EditorRoute.tsx`: opens on mount, closes on unmount, and only renders the editor when the loaded
  doc id matches the URL.
- `documentStore.close()`: request counter so StrictMode's mount/unmount/mount can't clobber a newer
  `open()`.

### 6. `feat(web): optional sign-in with background sync and conflict-safe merging`

**Scrutinize. The second-most important commit.**

- `features/sync/engine/planSync.ts`: the decision table is written out at the top of the file.
  Do you agree with every cell? (Tests: `planSync.test.ts` has one case per cell.)
- `runSync.ts`: how each action executes. Check `forkThenPull` and that every local write goes
  through `syncRepository.ts` compare-and-set.
- `accountSession.ts`: identity → database switch → adoption → sync triggers. `queueIdentity`
  serializes switches.
- `ClerkIdentityBridge.tsx`: ignores "signed out" while offline (and why).
- `AuthRoot.tsx` / `AuthControls.tsx`: no more gate.
- Tests: `runSync.test.ts` covers 8 end-to-end scenarios against `fakeServer.ts`, which copies the
  real API's compare-and-swap rules.

### 7. `feat(web): installable offline app (PWA) and persistent storage`

- `vite.config.ts`: `VitePWA` config. Most of this commit's line count is `package-lock.json`
  (workbox).
- `lib/persistentStorage.ts`: when and why we ask for persistence.

### 8. `feat(web): event backup export and import`

- `features/backup/lib/backupFile.ts`: the envelope format; imports go through `parseEventDoc`.
- `eventRepository.importEvent`: an id clash becomes an "(imported)" copy, never an overwrite.

### 9. `fix(web): never drop an editor save when the local record is missing`

A gap I found in self-review: during sign-in the active database switches before signed-out events
are moved over, so a save landing in that window used to be dropped. Saves now recreate a missing
record (tombstones still block).

### 10. `docs: …`

This guide, [architecture.md](./architecture.md), [data-model.md](./data-model.md) (storage
diagrams and capacity), [sync.md](./sync.md), project structure, README and CLAUDE.md.

---

## How to test it yourself

```bash
npm install
npm run build:shared
npm run typecheck
npm run db:up            # Postgres in Docker (only needed for API tests / sync)
npm test                 # 75 tests: shared 30 · api 7 · web 38
```

> If you had the old Homebrew `DATABASE_URL`, point `apps/api/.env` at the Docker database:
> `DATABASE_URL="postgresql://seating:seating@localhost:5432/seating_app?schema=public"`, then
> run `npm run prisma:migrate`.

Preview configs in `.claude/launch.json` (or run the commands yourself):

| Config        | Port | What it is                                                                         |
| ------------- | ---- | ---------------------------------------------------------------------------------- |
| `web`         | 5173 | Normal dev server with your `.env.local` (Clerk on): "Sign in to sync" visible     |
| `web-keyless` | 5174 | Clerk forced off: the pure local app                                               |
| `api`         | 4000 | Sync API                                                                           |
| `web-devsync` | 5175 | Clerk off + `VITE_DEV_SYNC_OWNER=dev-user`: syncs to the local API with no account |
| `web-preview` | 4173 | Production build (service worker active)                                           |

### Manual checklist

Each origin (port) has its own IndexedDB, so the ports don't share data.

- [ ] **Local only** (`web-keyless`): create an event, add tables and guests, seat someone, reload.
      Everything is still there.
- [ ] **Seat rules:** seat a guest, then lower that table's chair count below their seat number.
      They return to Unassigned. Delete a table and its guests are unassigned.
- [ ] **Routing:** the URL is `/events/<uuid>`. Refresh stays in the editor, back returns to the
      dashboard, and `/events/nope` shows "This event isn't on this device".
- [ ] **Backup:** card menu → Download backup, then Import backup. You get an "(imported)" copy.
- [ ] **Offline app** (`web-preview`): load once, stop the server, reload an event URL. It still
      works.
- [ ] **Sync** (`api` + `web-devsync`): create an event and the badge says "Synced";
      `curl -H 'x-owner-id: dev-user' localhost:4000/api/events` lists it. Stop the API, edit, and
      the badge says "Offline". Restart the API, focus the tab, and the edit reaches the server.
- [ ] **Edit from "another device":** `PUT` a changed doc with `curl` at the current version
      (example in sync.md), then focus the tab. The open editor updates.
- [ ] **Real sign-in** (`web` + `api` with `CLERK_SECRET_KEY` set): create events signed out, then
      sign in. You get the "Moved N events into your account" notice and they sync. Sign out and the
      dashboard shows the signed-out database (now empty).

### What I verified, and how

| Claim                                                                         | Verified by                                                                |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Every op preserves document validity and seat identity                        | 30 unit tests (shared)                                                     |
| API compare-and-swap, tombstones, owner isolation                             | 7 integration tests against Postgres 17                                    |
| Repository, writer, adoption, backup                                          | 16 unit tests (fake-indexeddb)                                             |
| Every cell of the conflict table, plus 8 multi-step sync scenarios            | 22 unit tests                                                              |
| Create/seat/reload persistence, routing, deep links, missing-event screen     | Browser, keyless build                                                     |
| Push on edit, pull of a remote edit into the open editor, offline → reconnect | Browser + real API + Postgres (dev-sync mode), confirmed with `curl`       |
| App loads and opens an event with the server stopped                          | Production build + service worker; confirmed nothing listening on the port |
| Clerk build has no gate and shows "Sign in to sync"                           | Browser, `web` config                                                      |
| Backup export → import round trip                                             | Browser (download intercepted in-page, then fed to the import input)       |

**Not verified:** the real Clerk sign-in → adoption flow. That needs signing into a real account,
which I can't do; the moving logic itself is unit-tested. Also not verified: Safari's eviction
behavior, and two tabs editing the same event at once (each tab saves whole documents, so the
last save wins between tabs on the same device).

---

## Decisions worth challenging

| Decision                                            | Why                                                                              | Alternative                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| One JSON document per event                         | Fits the data (small, edited as a unit); makes offline, backup and sync simple   | Keep relational tables + per-row sync                     |
| Whole-document sync, "keep both" on conflict        | Simple, auditable, never loses edits                                             | Field-level merge or a CRDT (Yjs) — more complex          |
| Keep Postgres + Fastify for sync                    | Already working; one table, six endpoints; cheap managed hosting (Neon/Supabase) | SQLite on a VM, or a BaaS (Supabase), or no server at all |
| Database per identity                               | No data mixing on shared browsers                                                | One database with an owner column                         |
| Signing in moves signed-out events in automatically | Least surprise for the common case (one person, one browser)                     | Ask first (better on shared computers)                    |
| Sign-out keeps the account's local copy             | Offline access next time                                                         | Delete on sign-out (better on shared computers)           |
| Old Prisma migrations replaced by a baseline        | No deployed DB existed; clearer history                                          | A migration that drops the old tables                     |
| Zod 3 (not 4)                                       | Matches the API's existing version                                               | Upgrade both together later                               |

---

## What this does to the earlier audit findings

**Fixed (the code is gone or rewritten):**

- The duplicate guest-list race on first open (there's no server-side get-or-create any more).
- The autosave data-loss window and no retry (local saves are immediate and serialized; sync
  retries automatically).
- Temporary `tmp-` seat ids rejected by the API (ids are client-generated UUIDs).
- No URL routing.
- The API leaking internal error text on 5xx in production.
- Assigning a seat racing outside the transaction (the server no longer does seat logic).

**Still open (out of scope here, as agreed):**

- `xlsx@0.18.5` has unfixed advisories. Switch to SheetJS's CDN build or `read-excel-file`.
- `npm audit fix` for fastify / find-my-way.
- No rate limiting or security headers on the API.
- No ESLint and no CI.
- React 18 / Vite 5 / Prisma 5 are behind current majors.
- The main JS chunk is about 830 KB (Clerk + Konva). Worth code-splitting.
- Mobile/touch: guest drag-and-drop still uses HTML5 DnD, which doesn't fire on touch.

---

## Follow-ups this makes easy

- **Undo/redo:** every edit is `apply(doc => op(doc))` on immutable documents, so a history stack
  is about 30 lines in `documentStore`.
- **Export/print:** the whole event is one object, ready to hand to a PDF or CSV generator.
- **Venue templates:** a template is just an event document (layout only), shipped as JSON.
- **Mobile app:** reuse `@seating/shared` and the sync API unchanged.
