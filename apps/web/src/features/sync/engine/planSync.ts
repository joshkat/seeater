import type { RemoteEventSummary } from "@seating/shared";

import { type SyncMeta, recordRole } from "../../storage/db/SeatingDb";

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
  | { type: "forkThenPull"; id: string; expectedUpdatedAt: string }
  /**
   * A shared event you can no longer change (access removed, made a viewer,
   * or the owner deleted it) has unsynced edits: keep them as your own copy
   * with fresh ids, and forget the original.
   */
  | { type: "keepAsCopy"; id: string; expectedUpdatedAt: string }
  /** You removed a shared event from your list: leave it on the server, then forget it. */
  | { type: "leave"; id: string; expectedUpdatedAt: string };

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
 *
 * Shared events (your role is editor or viewer) never delete or restore the
 * owner's copy, and viewers never push. These rules come first:
 *
 *   not owner, deleted here            → leave (removes it from your list only)
 *   viewer, edited here                → forkThenPull (keepAsCopy if gone)
 *   not owner, owner deleted it        → dropLocal, or keepAsCopy if edited
 *   not owner, missing from the list   → access removed: dropLocal, or keepAsCopy if edited
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

    if (server.role !== "owner") {
      const shared = planShared(mine, server);
      if (shared) actions.push(shared);
      if (shared || server.role === "viewer") continue;
    }

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
    if (recordRole(mine.sync) !== "owner") {
      // It was shared with us and isn't any more.
      const edited = mine.sync.dirty && !mine.sync.deleted;
      actions.push({
        type: edited ? "keepAsCopy" : "dropLocal",
        id: mine.id,
        expectedUpdatedAt: mine.updatedAt,
      });
    } else if (mine.sync.deleted) {
      actions.push({ type: "dropLocal", id: mine.id, expectedUpdatedAt: mine.updatedAt });
    } else {
      actions.push({ type: "push", id: mine.id, baseVersion: null });
    }
  }

  return actions;
}

/**
 * The shared-event rules (role editor or viewer), or null when the ordinary
 * table applies (an editor's normal pushes and pulls). For a viewer, null
 * means "pull if changed, else nothing".
 */
function planShared(mine: LocalSyncState, server: RemoteEventSummary): SyncAction | null {
  const { baseVersion, dirty, deleted } = mine.sync;
  const expectedUpdatedAt = mine.updatedAt;
  const edited = dirty && !deleted;

  if (deleted) return { type: "leave", id: mine.id, expectedUpdatedAt };
  if (server.deleted) {
    return { type: edited ? "keepAsCopy" : "dropLocal", id: mine.id, expectedUpdatedAt };
  }
  if (server.role === "viewer") {
    if (edited) return { type: "forkThenPull", id: mine.id, expectedUpdatedAt };
    return server.version === baseVersion ? null : { type: "pull", id: mine.id, expectedUpdatedAt };
  }
  return null;
}
