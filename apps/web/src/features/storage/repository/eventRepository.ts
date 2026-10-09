import {
  type DuplicateOptions,
  type EventDoc,
  type EventSummary,
  duplicateEventDoc,
  reidentifyEventDoc,
  renameEventDoc,
  summarizeEventDoc,
} from "@seating/shared";

import type { LocalEventRecord, SeatingDb, SyncMeta } from "../db/SeatingDb";

/**
 * Local CRUD over event documents. Every function takes the database
 * explicitly (callers pass `activeDb()`), which keeps these testable against
 * an in-memory IndexedDB and makes scope switches explicit.
 *
 * Every user edit marks the record `dirty`; the sync engine (when signed in)
 * is what clears it.
 */

const NEW_SYNC_META: SyncMeta = { baseVersion: null, dirty: true, deleted: false };

function toRecord(doc: EventDoc, sync: SyncMeta): LocalEventRecord {
  return { id: doc.id, doc, summary: summarizeEventDoc(doc), updatedAt: doc.updatedAt, sync };
}

/** Dashboard listing: live (non-deleted) events, most recently edited first. */
export async function listEventSummaries(db: SeatingDb): Promise<EventSummary[]> {
  const records = await db.events.orderBy("updatedAt").reverse().toArray();
  return records.filter((record) => !record.sync.deleted).map((record) => record.summary);
}

export async function getEventDoc(db: SeatingDb, id: string): Promise<EventDoc | null> {
  const record = await db.events.get(id);
  return record && !record.sync.deleted ? record.doc : null;
}

/** Stores a brand-new document. */
export async function createEvent(db: SeatingDb, doc: EventDoc): Promise<void> {
  await db.events.put(toRecord(doc, NEW_SYNC_META));
}

/**
 * Saves an edited document, stamping `updatedAt` and marking it dirty.
 * Returns the stored copy. Silently does nothing if the event was deleted
 * meanwhile (e.g. from another tab), so a stale editor can't resurrect it.
 */
export async function saveEventDoc(db: SeatingDb, doc: EventDoc): Promise<EventDoc | null> {
  return db.transaction("rw", db.events, async () => {
    const existing = await db.events.get(doc.id);
    if (!existing || existing.sync.deleted) return null;
    const stamped = { ...doc, updatedAt: new Date().toISOString() };
    await db.events.put(toRecord(stamped, { ...existing.sync, dirty: true }));
    return stamped;
  });
}

/** Loads, edits and saves a document in one go (used by dashboard actions). */
export async function updateEventDoc(
  db: SeatingDb,
  id: string,
  edit: (doc: EventDoc) => EventDoc,
): Promise<EventDoc | null> {
  const doc = await getEventDoc(db, id);
  if (!doc) return null;
  const next = edit(doc);
  return next === doc ? doc : saveEventDoc(db, next);
}

export function renameEvent(db: SeatingDb, id: string, name: string): Promise<EventDoc | null> {
  return updateEventDoc(db, id, (doc) => renameEventDoc(doc, name));
}

/** Copies an event into a new local document. Returns the new id. */
export async function duplicateEvent(
  db: SeatingDb,
  id: string,
  options: DuplicateOptions,
): Promise<string | null> {
  const source = await getEventDoc(db, id);
  if (!source) return null;
  const copy = duplicateEventDoc(source, options);
  await createEvent(db, copy);
  return copy.id;
}

/**
 * Adds an event from outside (a backup file). If an event with the same id is
 * already here — e.g. restoring a backup of an event you still have — it's
 * imported as a separate copy with fresh ids instead of overwriting.
 */
export async function importEvent(db: SeatingDb, doc: EventDoc): Promise<EventDoc> {
  const clash = await db.events.get(doc.id);
  const toStore = clash ? renameEventDoc(reidentifyEventDoc(doc), `${doc.name} (imported)`) : doc;
  await createEvent(db, toStore);
  return toStore;
}

/**
 * Deletes an event. Never-synced events are removed outright; synced ones
 * become a tombstone until the sync engine has deleted them on the server.
 */
export async function deleteEvent(db: SeatingDb, id: string): Promise<void> {
  await db.transaction("rw", db.events, async () => {
    const existing = await db.events.get(id);
    if (!existing) return;
    if (existing.sync.baseVersion === null) {
      await db.events.delete(id);
      return;
    }
    await db.events.put({
      ...existing,
      doc: null,
      updatedAt: new Date().toISOString(),
      sync: { ...existing.sync, dirty: true, deleted: true },
    });
  });
}
