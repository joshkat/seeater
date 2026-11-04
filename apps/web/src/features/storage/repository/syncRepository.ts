import {
  type EventDoc,
  MAX_EVENT_NAME_LENGTH,
  type RemoteEventSummary,
  reidentifyEventDoc,
  summarizeEventDoc,
} from "@seating/shared";

import type { LocalEventRecord, SeatingDb, SyncMeta } from "../db/SeatingDb";

/** The sharing fields of SyncMeta, as the server's list reports them. */
export type AccessMeta = Pick<SyncMeta, "role" | "ownerName" | "memberCount">;

export function accessMetaOf(summary: RemoteEventSummary | undefined): AccessMeta {
  if (!summary || summary.role === "owner") {
    return summary?.memberCount ? { memberCount: summary.memberCount } : {};
  }
  return { role: summary.role, ownerName: summary.ownerName, memberCount: 0 };
}

function sameAccess(sync: SyncMeta, meta: AccessMeta): boolean {
  return (
    (sync.role ?? "owner") === (meta.role ?? "owner") &&
    (sync.ownerName ?? "") === (meta.ownerName ?? "") &&
    (sync.memberCount ?? 0) === (meta.memberCount ?? 0)
  );
}

/**
 * Writes the sync engine makes to the local database. Each one is a
 * compare-and-set on the record's `updatedAt`: if the user edited the event
 * while a network request was in flight, the write is skipped (or the record
 * stays dirty) so a sync can never clobber a newer local edit. The next sync
 * pass simply re-plans from the new state.
 */

/** The local state the planner needs, read in one pass. */
export async function readSyncStates(db: SeatingDb): Promise<LocalEventRecord[]> {
  return db.events.toArray();
}

/**
 * After a successful push/create: record the server version. The record stays
 * dirty if it was edited after the copy we pushed was read.
 */
export async function markPushed(
  db: SeatingDb,
  id: string,
  version: number,
  pushedUpdatedAt: string,
): Promise<void> {
  await db.transaction("rw", db.events, async () => {
    const record = await db.events.get(id);
    if (!record) return;
    const unchanged = record.updatedAt === pushedUpdatedAt;
    await db.events.put({
      ...record,
      sync: { ...record.sync, baseVersion: version, dirty: !unchanged },
    });
  });
}

/**
 * Stores a document pulled from the server as the clean local copy, unless
 * the local record changed since the sync pass read it (`expectedUpdatedAt`,
 * or `null` meaning "expected to not exist"). Returns whether it was written.
 */
export async function applyPulled(
  db: SeatingDb,
  doc: EventDoc,
  version: number,
  expectedUpdatedAt: string | null,
  access: AccessMeta = {},
): Promise<boolean> {
  return db.transaction("rw", db.events, async () => {
    const record = await db.events.get(doc.id);
    if ((record?.updatedAt ?? null) !== expectedUpdatedAt) return false;
    await db.events.put({
      id: doc.id,
      doc,
      summary: summarizeEventDoc(doc),
      updatedAt: doc.updatedAt,
      sync: { baseVersion: version, dirty: false, deleted: false, ...access },
      // Trash is local: a pull mustn't take an event back out of it.
      trashedAt: record?.trashedAt ?? null,
    });
    return true;
  });
}

/** Removes a local record if it hasn't changed since the sync pass read it. */
export async function dropIfUnchanged(
  db: SeatingDb,
  id: string,
  expectedUpdatedAt: string,
): Promise<boolean> {
  return db.transaction("rw", db.events, async () => {
    const record = await db.events.get(id);
    if (!record || record.updatedAt !== expectedUpdatedAt) return false;
    await db.events.delete(id);
    return true;
  });
}

/**
 * Brings each record's role / owner name / member count in line with the
 * server's list. Doesn't touch `updatedAt` or `dirty`: it isn't an edit.
 */
export async function refreshAccess(db: SeatingDb, remote: RemoteEventSummary[]): Promise<void> {
  const byId = new Map(remote.map((summary) => [summary.id, summary]));
  await db.transaction("rw", db.events, async () => {
    await db.events.toCollection().modify((record) => {
      const summary = byId.get(record.id);
      if (!summary) return;
      const meta = accessMetaOf(summary);
      if (sameAccess(record.sync, meta)) return;
      const { baseVersion, dirty, deleted } = record.sync;
      record.sync = { baseVersion, dirty, deleted, ...meta };
    });
  });
}

/**
 * Replaces a local event with a copy under fresh ids, owned by you and not
 * yet synced (unless the record changed since `expectedUpdatedAt`). Used
 * when the id belongs to someone else's event (`suffix` omitted) and to keep
 * unsynced edits to a shared event you lost access to (`suffix` " (copy)").
 * Version history moves with it. Returns the new id, or null if skipped.
 */
export async function replaceWithOwnCopy(
  db: SeatingDb,
  id: string,
  expectedUpdatedAt: string,
  suffix = "",
): Promise<string | null> {
  return db.transaction("rw", [db.events, db.versions], async () => {
    const record = await db.events.get(id);
    if (!record?.doc || record.updatedAt !== expectedUpdatedAt) return null;
    const copy = reidentifyEventDoc(record.doc);
    copy.name = `${record.doc.name}${suffix}`.slice(0, MAX_EVENT_NAME_LENGTH);
    await db.events.put({
      id: copy.id,
      doc: copy,
      summary: summarizeEventDoc(copy),
      updatedAt: copy.updatedAt,
      sync: { baseVersion: null, dirty: true, deleted: false },
      trashedAt: record.trashedAt ?? null,
    });
    await db.versions.where("eventId").equals(id).modify({ eventId: copy.id });
    await db.events.delete(id);
    return copy.id;
  });
}
