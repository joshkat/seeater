# Sync

How a signed-in user's events stay in step between this browser and the server (and so across
their devices). Signed-out use never touches the network; this whole doc applies only after
sign-in.

The short version:

- The browser is always the working copy.
- The server stores whole documents, each with a `version` number.
- Every upload says which version it was based on, and the server only accepts it if that's still
  the latest (compare-and-swap).
- If two devices edit the same event before syncing, **both versions are kept**.

---

## The protocol

All endpoints are owner-scoped (the owner comes from the Clerk session) and live under `/api`.
Request and response types are in
[`packages/shared/src/sync/protocol.ts`](../packages/shared/src/sync/protocol.ts).

| Method & path                      | Body / query                            | Success                                                                         | Stale                                       |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| `GET /events`                      | —                                       | `{ events: [{ id, name, version, deleted, updatedAt }] }` (includes tombstones) | —                                           |
| `GET /events/:id`                  | —                                       | `{ id, version, deleted, updatedAt, data }`                                     | 404 if unknown                              |
| `PUT /events/:id`                  | `{ baseVersion: number \| null, data }` | `{ id, version }`                                                               | **409** `{ current: { version, deleted } }` |
| `DELETE /events/:id?baseVersion=N` | —                                       | 204 (also if already gone)                                                      | **409**                                     |

- `baseVersion: null` means "create". It's a 409 if the id already exists.
- A PUT lands only if the stored version still equals `baseVersion`. It's a single
  `UPDATE … WHERE version = $base` (see
  [`event.service.ts`](../apps/api/src/modules/events/event.service.ts)), so two racing writers
  can't both win.
- A PUT at a tombstone's current version brings the event back.
- `data` is validated with the shared `eventDocSchema`, so bad documents get a 400. Bodies are
  limited to 5 MB.

---

## One sync pass

```mermaid
sequenceDiagram
  autonumber
  participant UI as Editor
  participant IDB as IndexedDB
  participant Eng as Sync engine
  participant API as Sync API
  participant PG as Postgres

  UI->>IDB: save doc (dirty = true)
  Note over Eng: a Dexie live query sees dirty > 0<br/>and schedules a pass 1.5 s later
  Eng->>API: GET /events
  API->>PG: SELECT id, version, deleted …
  API-->>Eng: [{ id, version, deleted }]
  Eng->>IDB: read all records (baseVersion, dirty, deleted)
  Eng->>Eng: planSync(local, remote) → actions
  Eng->>API: PUT /events/:id { baseVersion, data }
  API->>PG: UPDATE … WHERE version = baseVersion
  API-->>Eng: { version: base + 1 }
  Eng->>IDB: baseVersion = new version, dirty = false<br/>(only if unchanged since read)
```

[`runSync.ts`](../apps/web/src/features/sync/engine/runSync.ts) lists the server, reads local state,
calls the planner, and runs the actions. If anything had to be skipped because state moved
underneath it, it re-plans, up to 3 passes.

### When a pass runs

From [`accountSession.ts`](../apps/web/src/features/sync/engine/accountSession.ts):

- right after sign-in (and at startup, if already signed in);
- 1.5 s after the last local change (any record becomes `dirty`);
- when the window regains focus or the browser comes back online;
- every 60 s while the tab is visible, to pick up other devices' changes.

Only one pass runs at a time; requests during a pass fold into one follow-up pass
([`syncScheduler.ts`](../apps/web/src/features/sync/engine/syncScheduler.ts)).

---

## The conflict policy

All of it lives in one pure function,
[`planSync.ts`](../apps/web/src/features/sync/engine/planSync.ts), tested case by case in
`planSync.test.ts`. The guiding rule: **never lose an edit.**

`base` is the server version this browser last reconciled with. `v` is the server's version now.

| local ↓ / server → | `v == base` (unchanged) | `v != base` (someone else edited) | `v != base`, deleted elsewhere |
| ------------------ | ----------------------- | --------------------------------- | ------------------------------ |
| **clean**          | nothing                 | pull                              | drop locally                   |
| **edited (dirty)** | push at `base`          | **keep both** (fork, then pull)   | push at `v` (restores it)      |
| **deleted here**   | delete on server        | pull (their edit wins)            | drop locally                   |
| **not here**       | —                       | pull                              | nothing                        |

The server has never seen it: push as new, or drop it if it's a local tombstone.

**"Keep both"** means the local version is saved as a new event called
`"<name> (conflicted copy)"` with fresh ids. The server's version keeps the original id. Both end
up on every device after the next pass. The user decides which to keep, and nothing is merged
behind their back.

### Not clobbering the user mid-sync

Network calls take time, and the user may keep editing. Every local write the engine makes is a
**compare-and-set on the record's `updatedAt`**
([`syncRepository.ts`](../apps/web/src/features/storage/repository/syncRepository.ts)):

- A pull is only written if the record hasn't changed since the pass read it.
- After a push, the record is marked clean only if it hasn't changed since the pushed copy was
  read. Otherwise it stays dirty, and the newer edit goes up next time.
- A local drop only happens if the record is unchanged.

If a pull rewrites the event that's open in the editor, the editor reloads it. Pulls only happen
for events with no unsynced local edits, so in practice this is a change from another device
appearing while you watch.

---

## Identity and local databases

```mermaid
stateDiagram-v2
  [*] --> SignedOut: no Clerk session<br/>(or no Clerk key at all)
  [*] --> Account: last account id remembered<br/>(works offline)
  SignedOut --> Account: sign in<br/>→ flush pending saves<br/>→ switch to seating-account-id<br/>→ move signed-out events in<br/>→ sync
  Account --> SignedOut: sign out<br/>→ switch to seating-local<br/>(account copy kept for offline)
  Account --> Account: offline 'signed out' reading<br/>is ignored
```

- **Signing in moves your signed-out events into the account**, so they sync. If the account
  already has the same id, the newer copy wins. A one-off notice says how many moved.
- The last account id is kept in localStorage, so the right database opens instantly, even offline
  or if Clerk can't load.
- While offline, a "signed out" reading from Clerk is ignored. Clerk can't refresh a session
  without the network, and switching databases would make your events look like they vanished.

---

## Status the user sees

| Badge                  | Meaning                                                                           |
| ---------------------- | --------------------------------------------------------------------------------- |
| _Saved on this device_ | The local save finished (always shown in the editor)                              |
| _(no sync badge)_      | Signed out. The "Sign in to sync" button is shown instead                         |
| **Synced**             | Up to date as of the last pass (hover for the time)                               |
| **Syncing…**           | A pass is running                                                                 |
| **Offline**            | Signed in but the API is unreachable. Edits are safe locally and will go up later |
| **Sync paused**        | The API rejected us (e.g. session expired). Hover for the reason                  |

---

## Trying it by hand

With `npm run db:up`, the `api` preview (or `npm run dev:api`) and the `web-devsync` preview
(keyless, syncing as `dev-user`):

```bash
# What the server has for dev-user
curl -s -H 'x-owner-id: dev-user' localhost:4000/api/events

# Pretend to be another device: fetch an event, change it, write it back at its version
ID=<event id from the list>
curl -s -H 'x-owner-id: dev-user' localhost:4000/api/events/$ID > /tmp/ev.json
python3 -c "import json;d=json.load(open('/tmp/ev.json'));doc=d['data'];doc['name']+=' (laptop)';print(json.dumps({'baseVersion':d['version'],'data':doc}))" > /tmp/put.json
curl -s -X PUT -H 'x-owner-id: dev-user' -H 'Content-Type: application/json' \
  --data @/tmp/put.json localhost:4000/api/events/$ID
```

Focus the browser tab and the open editor shows the new name. Run the same `PUT` again with the
old `baseVersion` and you get a 409. That's the compare-and-swap at work.

---

## Known limitations (deliberate, for now)

- **Whole-document granularity.** Two devices editing _different_ tables of the same event at the
  same time still produce a conflicted copy rather than a merge. Fine for "my phone and my laptop";
  not for live collaboration. Upgrade path: per-entity merge in the planner, or a CRDT (Yjs) if real
  multiplayer is ever wanted.
- **Tombstones are never purged.** Deleted rows keep `id`, `name` and `version` forever. That's
  cheap, but a cleanup job (e.g. purge after 90 days) would be tidy.
- **No sharing yet.** Every document has exactly one owner. Sharing or co-editing will need an
  access table on the server; the document format doesn't change.
- **Signing out doesn't delete the account's local copy** (so it works offline next time). On a
  shared computer you'd want a "remove from this device" option.
