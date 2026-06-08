# Project Structure

An annotated map of the repository, so you know where everything lives and where new code should go.
For the _why_ behind this layout, read [architecture.md](./architecture.md).

```
custom-seating-app/
├── package.json            # workspace root: scripts (dev:api, dev:web, build:shared, typecheck…)
├── tsconfig.base.json      # shared strict TypeScript config, extended by each package
├── README.md               # how to run it locally
├── CLAUDE.md               # agent onboarding + gotchas cheatsheet
├── docs/                   # ← you are here (human developer docs)
│
├── packages/
│   └── shared/             # @seating/shared — the API↔web contract. Build to dist/ before use.
│       └── src/
│           ├── types/      # domain types: geometry, seat, table, floorPlan, event
│           ├── geometry/   # seat-layout math + constants (chair sizes, default plan size…)
│           └── index.ts    # barrel: re-exports everything
│
├── apps/
│   ├── api/                # @seating/api — Fastify + Prisma + PostgreSQL
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # the database models (FloorPlan, Table, Seat, Event, Guest)
│   │   │   └── migrations/      # generated SQL migrations (run via npm run prisma:migrate)
│   │   ├── .env                 # DATABASE_URL etc. (gitignored — secrets)
│   │   ├── .env.example         # template to copy
│   │   └── src/
│   │       ├── server.ts        # boots the HTTP server
│   │       ├── app.ts           # builds the Fastify app: plugins, CORS, error handler, routes
│   │       ├── config/env.ts    # zod-validated environment variables
│   │       ├── plugins/         # Fastify plugins (e.g. prisma client injection)
│   │       ├── lib/
│   │       │   ├── mappers.ts   # Prisma rows → shared DTOs (the DB↔API boundary)
│   │       │   ├── auth.ts      # dev owner-id resolution (x-owner-id header)
│   │       │   └── validation.ts# reusable zod pieces (point, size)
│   │       └── modules/         # one folder per feature, each with routes/service/schema
│   │           ├── floorPlans/  # CRUD + summaries + duplicate
│   │           ├── tables/      # table + seat create/update/delete (seat reconcile lives here)
│   │           ├── events/      # get-or-create the default guest-list event per plan
│   │           └── guests/      # guest CRUD, bulk import, seat assignment
│   │
│   └── web/                # @seating/web — React + Vite
│       ├── index.html
│       ├── vite.config.ts       # React + Tailwind plugins, react-konva dedupe (see gotchas)
│       ├── .env.example         # VITE_API_BASE_URL
│       └── src/
│           ├── main.tsx         # entry: restores theme, mounts <App>
│           ├── App.tsx          # renders <Dashboard> or <EditorPage> based on navStore.view
│           ├── styles/global.css# Tailwind import + DaisyUI custom theme(s)
│           ├── lib/
│           │   ├── apiClient.ts # thin fetch wrapper (base URL, JSON, error shape)
│           │   └── theme.ts     # theme persistence (localStorage + <html data-theme>)
│           └── features/        # feature-first organisation (the heart of the app)
│               ├── editor/      # the canvas editor
│               ├── guests/      # the guest panel + seating
│               └── dashboard/   # the "My Events" landing + navigation
```

## How a feature folder is organised

Each `features/<name>/` folder is self-contained and follows the same shape. Example —
`features/editor/`:

```
features/editor/
├── components/          # React components (one per file)
│   ├── EditorPage.tsx       # the screen layout (header + panels + canvas)
│   ├── Toolbar.tsx          # add-table buttons, theme picker
│   ├── PropertiesPanel.tsx  # right-side inspector for the selected table
│   ├── SaveStatusBadge.tsx
│   └── canvas/              # the react-konva pieces
│       ├── EditorCanvas.tsx     # the <Stage>; wires drag/drop, zoom, selection
│       ├── TableNode.tsx        # one table (group: shape + chairs + label)
│       ├── ChairNode.tsx        # one chair (with occupant initials)
│       ├── TableShapeNode.tsx   # the round/rect outline
│       ├── ZoomControls.tsx     # the +/−/reset overlay
│       └── …                    # grid, alignment guides, selection transformer
├── store/               # zustand store(s) for this feature
│   ├── editorStore.ts
│   └── persistQueue.ts      # debounced autosave helper
├── api/                 # functions that call the backend (uses lib/apiClient)
│   └── floorPlanApi.ts
├── geometry/            # pure math (no React)
│   ├── viewport.ts          # fit / focus / zoom / clamp
│   └── snapping.ts          # grid + alignment snapping
├── hooks/               # custom React hooks
│   └── useKeyboardShortcuts.ts
└── lib/                 # small pure helpers
    └── tableLabel.ts        # "Table 3" fallback naming
```

`features/guests/` and `features/dashboard/` follow the same `components / store / api / lib`
pattern.

## Conventions for adding code

- **New component → its own file** under the relevant `features/<name>/components/`. No giant files.
- **Talks to the backend?** Add a function in that feature's `api/` folder (it uses the shared
  `lib/apiClient.ts` wrapper), and a matching endpoint in `apps/api/src/modules/`.
- **New domain field/type?** Add it to `packages/shared/src/types/`, run `npm run build:shared`,
  then use it on both ends.
- **Pure math** (positions, geometry, formatting) goes in a `geometry/` or `lib/` file with no
  React imports, so it's easy to test and reuse.
- **Styling** uses Tailwind/DaisyUI classes, not inline styles — see [styling.md](./styling.md).
