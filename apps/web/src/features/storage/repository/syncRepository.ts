import { type EventDoc, summarizeEventDoc } from "@seating/shared";

import type { LocalEventRecord, SeatingDb } from "../db/SeatingDb";

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
): Promise<boolean> {
  return db.transaction("rw", db.events, async () => {
    const record = await db.events.get(doc.id);
    if ((record?.updatedAt ?? null) !== expectedUpdatedAt) return false;
    await db.events.put({
      id: doc.id,
      doc,
      summary: summarizeEventDoc(doc),
      updatedAt: doc.updatedAt,
      sync: { baseVersion: version, dirty: false, deleted: false },
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
