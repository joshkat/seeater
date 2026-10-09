# Project Structure

An annotated map of the repository: where everything lives and where new code should go. For the
_why_ behind this layout, read [architecture.md](./architecture.md).

```
custom-seating-app/
├── package.json            # workspace root: dev/build/test/typecheck scripts, db:up / db:down
├── docker-compose.yml      # local Postgres for the optional sync API (npm run db:up)
├── tsconfig.base.json      # shared strict TypeScript config
├── README.md               # running, configuring, deploying
├── CLAUDE.md               # agent onboarding + gotchas cheatsheet
├── docs/                   # ← you are here
│   ├── architecture.md         # how it fits together (start here)
│   ├── data-model.md           # the event document + storage diagrams + capacity
│   ├── sync.md                 # sign-in sync protocol + conflict policy
│   ├── reviewing-local-first.md# guide for auditing the local-first migration PR
│   ├── project-structure.md
│   └── styling.md
│
├── packages/
│   └── shared/                 # @seating/shared — the contract. `npm run build:shared` after edits.
│       └── src/
│           ├── document/
│           │   ├── schema.ts       # zod schema for the event document; types inferred from it
│           │   ├── integrity.ts    # cross-reference rules (unique ids, one guest per seat…)
│           │   ├── migrate.ts      # parseEventDoc(): upgrade + validate untrusted input
│           │   ├── ids.ts          # client-side UUIDs
│           │   ├── eventOps.ts     # create / rename / duplicate a document
│           │   ├── tableOps.ts     # add / move / resize / chairs / duplicate / delete tables
│           │   ├── guestOps.ts     # add / edit / remove guests, assign seats
│           │   ├── summary.ts      # dashboard tile data
│           │   └── __tests__/      # unit tests (excluded from the build)
│           ├── sync/protocol.ts    # wire types for /api/events
│           ├── geometry/           # seat-layout math + constants
│           ├── types/geometry.ts   # Point, Size
│           └── index.ts            # barrel
│
└── apps/
    ├── web/                    # @seating/web — the product (React + Vite + react-konva)
    │   ├── vite.config.ts          # React, Tailwind, PWA (service worker + manifest), konva dedupe
    │   ├── vitest.config.ts        # unit tests in Node against fake-indexeddb
    │   ├── public/                 # favicon + PWA icons
    │   └── src/
    │       ├── main.tsx            # theme → startAccountSession() → render (Clerk optional)
    │       ├── App.tsx             # routes: /, /events/:eventId, *
    │       ├── components/         # app-level components (NotFoundPage)
    │       ├── lib/                # apiClient, authToken bridge, theme, downloadFile, persistentStorage
    │       └── features/
    │           ├── storage/        # IndexedDB: SeatingDb, scopes, repository, coalesced writer
    │           ├── editor/         # canvas editor + documentStore (the open event)
    │           ├── guests/         # guest panel, import (CSV/XLSX), seating actions
    │           ├── dashboard/      # "My Events" list (live query), create/rename/duplicate/delete
    │           ├── backup/         # download / import `.seating.json`
    │           ├── auth/           # optional Clerk: identity store, bridge, controls, theming
    │           └── sync/           # sync API client, planner, runner, scheduler, status UI
    │
    └── api/                    # @seating/api — optional sync service (Fastify + Prisma + Postgres)
        ├── prisma/
        │   ├── schema.prisma       # one model: EventDocument
        │   └── migrations/         # one baseline migration
        └── src/
            ├── server.ts           # boots the HTTP server
            ├── app.ts              # plugins, CORS, Clerk (if configured), error handler, routes
            ├── config/env.ts       # zod-validated env
            ├── plugins/prisma.ts   # Prisma client on the Fastify instance
            ├── lib/auth.ts         # owner id: verified Clerk user, else x-owner-id (dev)
            ├── routes/health.ts    # GET /api/health
            └── modules/events/     # GET/PUT/DELETE /api/events — routes, service, schema, tests
```

## Inside the web features

```
features/storage/
├── db/SeatingDb.ts             # Dexie database: `events` store (doc + summary + sync meta)
├── db/scope.ts                 # signed-out vs per-account database names
├── store/storageStore.ts       # the active database
└── repository/
    ├── eventRepository.ts      # create / list / get / save / rename / duplicate / import / delete
    ├── coalescedWriter.ts      # serialized, latest-wins saves
    ├── syncRepository.ts       # compare-and-set writes used only by the sync engine
    └── adoptEvents.ts          # move signed-out events into an account on sign-in

features/editor/
├── components/                 # EditorRoute (load/unload), EditorPage, EditorStatusScreen,
│   │                           # Toolbar, PropertiesPanel, SaveStatusBadge
│   └── canvas/                 # react-konva: EditorCanvas, TableNode, ChairNode, …
├── store/documentStore.ts      # the open event document + local save status
├── store/editorStore.ts        # viewport / focus / selection + table actions
├── hooks/                      # useDocumentSelectors, useKeyboardShortcuts, useUnsavedChangesGuard
├── geometry/                   # viewport + snapping math (pure)
└── lib/tableLabel.ts

features/sync/
├── api/syncApi.ts              # SyncApi interface + HTTP implementation
├── engine/planSync.ts          # pure conflict policy (the decision table)
├── engine/runSync.ts           # executes a plan against IndexedDB + API
├── engine/syncScheduler.ts     # one pass at a time, debounced, status reporting
├── engine/accountSession.ts    # identity → database → sync wiring + triggers
├── store/syncStore.ts
└── components/                 # SyncStatusBadge, SyncNotice
```

## Conventions for adding code

- **New component → its own file** under `features/<name>/components/`.
- **Changing what an event contains?** Edit `packages/shared/src/document/schema.ts`. If old
  documents won't satisfy the new shape, bump `EVENT_DOC_SCHEMA_VERSION` and add an upgrade step in
  `migrate.ts`. Then `npm run build:shared`.
- **New kind of edit?** Write it as a pure function in `packages/shared/src/document/*Ops.ts`, with
  a test, and call it from a store via `documentStore.apply(doc => op(doc, …))`. Don't edit the
  document anywhere else.
- **Reading the open event in a component?** Use the selector hooks in
  `features/editor/hooks/useDocumentSelectors.ts`.
- **Touching storage?** Go through `features/storage/repository/*` and pass `activeDb()`, so the
  right identity's database is used.
- **The API changes only if the sync protocol changes.** Feature work normally doesn't touch
  `apps/api`.
- **Styling** uses Tailwind/DaisyUI classes. See [styling.md](./styling.md).
- **Tests:** `npm test` runs all workspaces. Web tests live in `__tests__/` next to the code and
  run in Node with fake-indexeddb. API tests need Postgres (`npm run db:up`).
