import type { RemoteEventSummary } from "@seating/shared";

import type { SyncMeta } from "../../storage/db/SeatingDb";

/** What the planner needs to know about each local record. */
export interface LocalSyncState {
  id: string;
  updatedAt: string;
  sync: SyncMeta;
}

/**
 * One step of a sync pass. `expectedUpdatedAt` is the local record's
 * `updatedAt` when planned; executors use it to skip work if the user edited
 * the event meanwhile (the next pass re-plans).
 */
export type SyncAction =
  /** Download the server copy over a clean (or absent) local copy. */
  | { type: "pull"; id: string; expectedUpdatedAt: string | null }
  /** Upload local changes. `baseVersion: null` creates the document. */
  | { type: "push"; id: string; baseVersion: number | null }
  /** Delete on the server, then forget locally. */
  | { type: "deleteRemote"; id: string; baseVersion: number; expectedUpdatedAt: string }
  /** Forget the local record (deleted elsewhere, or our delete is confirmed). */
  | { type: "dropLocal"; id: string; expectedUpdatedAt: string }
  /** Both sides edited: save local edits as a new copy, then pull the server copy. */
  | { type: "forkThenPull"; id: string; expectedUpdatedAt: string };

/**
 * Decides how to reconcile local records with the server's list. Pure — the
 * whole conflict policy lives here and is unit-tested in isolation.
 *
 * Policy: never lose an edit. When both sides changed the same event, the
 * server copy keeps the original id and the local edits survive as a
 * "(conflicted copy)". A remote delete loses to unsynced local edits (the
 * event is restored); a local delete loses to newer remote edits.
 *
 *   local \ remote        | same version (v == base) | remote changed (v != base)  | remote deleted (v != base)
 *   ----------------------|--------------------------|-----------------------------|---------------------------
 *   clean                 | nothing                  | pull                        | dropLocal
 *   dirty (edited)        | push(base)               | forkThenPull                | push(v)  — restore
 *   deleted (tombstone)   | deleteRemote(base)       | pull     — remote edit wins | dropLocal
 *   absent                | —                        | pull                        | nothing
 *
 *   Local records the server has never seen: push(null), or dropLocal if
 *   they're tombstones.
 */
export function planSync(local: LocalSyncState[], remote: RemoteEventSummary[]): SyncAction[] {
  const actions: SyncAction[] = [];
  const localById = new Map(local.map((record) => [record.id, record]));
  const remoteIds = new Set<string>();

  for (const server of remote) {
    remoteIds.add(server.id);
    const mine = localById.get(server.id);

    if (!mine) {
      if (!server.deleted) actions.push({ type: "pull", id: server.id, expectedUpdatedAt: null });
      continue;
    }

    const { baseVersion, dirty, deleted } = mine.sync;
    const expectedUpdatedAt = mine.updatedAt;

    if (server.version === baseVersion) {
      if (deleted) {
        actions.push({ type: "deleteRemote", id: mine.id, baseVersion, expectedUpdatedAt });
      } else if (dirty) {
        actions.push({ type: "push", id: mine.id, baseVersion });
      }
      continue;
    }

    // The server moved on since our base (or we never synced this id).
    if (server.deleted) {
      if (dirty && !deleted) {
        actions.push({ type: "push", id: mine.id, baseVersion: server.version });
      } else {
        actions.push({ type: "dropLocal", id: mine.id, expectedUpdatedAt });
      }
    } else if (!dirty || deleted) {
      actions.push({ type: "pull", id: mine.id, expectedUpdatedAt });
    } else {
      actions.push({ type: "forkThenPull", id: mine.id, expectedUpdatedAt });
    }
  }

  for (const mine of local) {
    if (remoteIds.has(mine.id)) continue;
    if (mine.sync.deleted) {
      actions.push({ type: "dropLocal", id: mine.id, expectedUpdatedAt: mine.updatedAt });
    } else {
      actions.push({ type: "push", id: mine.id, baseVersion: null });
    }
  }

  return actions;
}
