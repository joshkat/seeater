# Architecture

A guided tour of how the seating-chart app is built and how the pieces talk to each other.
If you read one doc, read this one. See also [project-structure.md](./project-structure.md) for a
file-by-file map and [styling.md](./styling.md) for the UI/theming system.

---

## The big picture

It's a single product split into three packages inside one repo (an **npm-workspaces monorepo**):

```
┌─────────────────────────────────────────────────────────────┐
│  apps/web  — React app (the UI you click)                    │
│    • Canvas editor (react-konva)                             │
│    • Guest panel, dashboard                                  │
│    • zustand stores hold all client state                   │
└───────────────┬─────────────────────────────────────────────┘
                │  HTTP/JSON (fetch)
                │  types come from @seating/shared
┌───────────────▼─────────────────────────────────────────────┐
│  apps/api  — Fastify REST API                                │
│    • Validates input (zod)                                   │
│    • Talks to the DB (Prisma)                                │
│    • Maps DB rows → shared DTOs                              │
└───────────────┬─────────────────────────────────────────────┘
                │  Prisma Client
┌───────────────▼─────────────────────────────────────────────┐
│  PostgreSQL — the source of truth                            │
└─────────────────────────────────────────────────────────────┘

        packages/shared (@seating/shared)
        ▲ imported by BOTH web and api ▲
        The TypeScript "contract": domain types + seat geometry.
```

**Why a monorepo with a shared package?** The web app and the API have to agree on the shape of a
`Table`, a `Guest`, a `FloorPlan`, etc. Instead of defining those types twice (and letting them
drift), they're defined once in `@seating/shared` and imported by both ends. If you change a type,
both sides get a compile error until they agree again. The same package also holds the **seat
geometry math** (where chairs sit around a table), so the server and client compute identical
positions.

**Why keep the API separate from the web app?** So a future mobile app can reuse the exact same
REST API — the web app is just one client.

---

## The domain model (what the app is actually about)

```
FloorPlan ("an event", e.g. "Sarah & Tom's Wedding")
  ├── Table[]            (round or rectangle, placed on the canvas)
  │     └── Seat[]       (chairs; auto-arranged or hand-placed)
  └── Event              (the guest-list container — exactly one per plan, created on demand)
        └── Guest[]      (each may sit in one Seat; RSVP = pending/accepted/declined)
```

A few rules worth internalising:

- A **`FloorPlan` is what the user calls an "event."** It has a name, the table layout, and a
  one-to-one default `Event` named "Guest list" that holds the guests. (The separate `Event` table
  is an implementation detail — it exists so guests have a home and so the model can grow later.)
- **One guest per seat.** Enforced in the database (`Guest.seatId` is unique). If you drop a guest
  onto an already-occupied seat, the previous occupant is **displaced** back to unassigned.
- **Seats have stable identity.** When you change a table's chairs (toggle auto/custom, nudge a
  chair, change the count), the server _updates the existing seat rows in place by index_ rather
  than deleting and recreating them. This is the whole reason a seated guest stays seated when you
  tweak their table — the seat keeps its id, so the guest's `seatId` still points at it.

The Prisma schema lives in `apps/api/prisma/schema.prisma`; the matching TypeScript types live in
`packages/shared/src/types/`.

---

## How a change flows end-to-end

Follow one concrete action — **dragging a guest onto a chair** — through every layer:

1. **UI event.** You drop a guest tile onto the canvas. `EditorCanvas`'s drop handler figures out
   which seat (or table) you dropped on using Konva hit-testing.
2. **Store action (optimistic).** It calls `assignSeat(guestId, seatId)` on the **guest store**.
   The store immediately updates its in-memory list — the guest appears in the seat _right now_,
   before the network responds. It also clears anyone who was in that seat (displacement).
3. **API call.** The store calls `assignGuestSeat(...)` in the API client, which does a
   `PUT /events/:eventId/guests/:guestId/seat`.
4. **Server.** Fastify validates the body (zod), the `GuestService` checks ownership + that the
   seat belongs to this plan, performs the assignment in a transaction (displacing any occupant),
   and returns every guest whose seat changed.
5. **Reconcile.** The store merges the server's response back into its list (replacing the
   optimistic guess with the source of truth). If the request had failed, it rolls back to the
   previous state.

That **optimistic-update-then-reconcile** pattern is used throughout the client: the UI feels
instant, and the server stays authoritative.

---

## Client state: the three stores

Client state lives in **[zustand](https://github.com/pmndrs/zustand) stores** — small, hook-based
state containers. There are three, each owning one concern:

| Store           | File                                   | Owns                                                                                      |
| --------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| **editorStore** | `features/editor/store/editorStore.ts` | The open plan: its tables, the canvas viewport (pan/zoom/focus), selection, and autosave. |
| **guestStore**  | `features/guests/store/guestStore.ts`  | The guest list for the open event: guests, multi-selection, and seat assignment.          |
| **navStore**    | `features/dashboard/store/navStore.ts` | Which screen you're on (`dashboard` vs `editor`) and switching between events.            |

They're deliberately decoupled but coordinate when needed. For example, opening an event
(`navStore.openEvent`) resets the guest store and tells the editor store to load the new plan, so
one event's guests never bleed into another.

**Autosave** (editor store): there's no Save button. Each edit to a table schedules a _debounced_
`PATCH` through `persistQueue.ts`, which coalesces rapid edits (e.g. while dragging) into one
request and shows the "Saving…/All changes saved" badge.

---

## The canvas (react-konva)

The visual editor is an HTML `<canvas>` driven by **react-konva** — a React renderer for the Konva
2D library. Instead of DOM elements, you write `<Stage>`, `<Layer>`, `<Group>`, `<Circle>`,
`<Rect>`, `<Text>` and Konva paints them.

- A **table** is a `<Group>` positioned at its center, containing the table shape + chair nodes + a
  label. Putting it in a group means dragging/rotating the group moves everything together.
- The **viewport** (pan/zoom) is applied to the whole `<Stage>` (`x`, `y`, `scaleX/Y`). All the
  fit-to-view / zoom-to-table / clamp math is pure functions in
  `features/editor/geometry/viewport.ts`, so it's easy to test and reason about.
- **Coordinates:** the floor plan has its own units (e.g. 1600×1000). Screen pixels =
  `worldCoord * scale + viewportOffset`. Keep that mapping in mind when something looks
  mis-positioned.

> ⚠️ react-konva is sensitive to Vite's dependency pre-bundling. If the canvas ever crashes in
> `<StageWrap>`, see the Gotchas in [`CLAUDE.md`](../CLAUDE.md) — the fix is usually
> `rm -rf node_modules/.vite` and restarting the dev server.

---

## The API layer

Fastify, organised by **feature module**. Each module under `apps/api/src/modules/<feature>/` has
three files:

- `*.routes.ts` — the HTTP endpoints (URL + method), thin glue.
- `*.service.ts` — the business logic + Prisma queries.
- `*.schema.ts` — zod schemas that validate and type the request bodies/params.

Cross-cutting helpers live in `src/lib/`:

- `mappers.ts` — converts Prisma rows (flat columns, `Date` objects) into the shared DTO shapes the
  web app expects (nested `position`/`size`, ISO date strings). **This is the boundary** between
  "database shape" and "API/web shape."
- `auth.ts` — for now, a dev placeholder: the owner id comes from an `x-owner-id` header, defaulting
  to `dev-user`. Real auth (Clerk) is deferred; every service query already filters by owner, so
  swapping in real identity later is a small change.

A request lifecycle: **route → zod-validate → service (ownership check + Prisma) → mapper → JSON.**

---

## Key design decisions (the "why")

- **Shared types as a contract.** One source of truth for domain shapes prevents API/UI drift.
- **Optimistic UI + reconcile.** Instant-feeling interactions without giving up server authority.
- **Seat reconciliation by index, not delete/recreate.** Preserves seat identity so guest
  assignments survive table edits. (Learned the hard way — see the Gotchas.)
- **A `FloorPlan` = an "event."** Avoids a heavier multi-entity model while still giving each event
  its own layout + guest list. The dashboard lists plans; opening one loads its editor.
- **Layout-only duplication by default.** Duplicating an event copies the table layout; bringing
  over guests / seat assignments is opt-in, because those usually differ per event.
- **No client router (yet).** A simple `view` flag in `navStore` toggles dashboard ↔ editor. Easy
  to swap for a real router later if deep-linking is needed.

---

## Where to go next

- Want to find a specific file? → [project-structure.md](./project-structure.md)
- Adding or restyling UI? → [styling.md](./styling.md)
- Running it locally / environment setup? → the root [README.md](../README.md)
- Quick agent-oriented cheatsheet + gotchas? → [CLAUDE.md](../CLAUDE.md)
