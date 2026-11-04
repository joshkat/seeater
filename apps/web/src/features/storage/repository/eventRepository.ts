import {
  type DuplicateOptions,
  type EventDoc,
  type EventRole,
  type EventSummary,
  duplicateEventDoc,
  reidentifyEventDoc,
  renameEventDoc,
  summarizeEventDoc,
} from "@seating/shared";

import { type LocalEventRecord, type SeatingDb, type SyncMeta, recordRole } from "../db/SeatingDb";

/**
 * Local CRUD over event documents. Every function takes the database
 * explicitly (callers pass `activeDb()`), which keeps these testable against
 * an in-memory IndexedDB and makes scope switches explicit.
 *
 * Every user edit marks the record `dirty`; the sync engine (when signed in)
 * is what clears it.
 */

const NEW_SYNC_META: SyncMeta = { baseVersion: null, dirty: true, deleted: false };

/** How long a trashed event can be restored before it's deleted for good. */
export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function toRecord(
  doc: EventDoc,
  sync: SyncMeta,
  trashedAt: string | null = null,
): LocalEventRecord {
  return {
    id: doc.id,
    doc,
    summary: summarizeEventDoc(doc),
    updatedAt: doc.updatedAt,
    sync,
    trashedAt,
  };
}

/** An event that exists and isn't deleted or in the trash. */
function isLive(record: LocalEventRecord): boolean {
  return !record.sync.deleted && !record.trashedAt && record.doc !== null;
}

/** Dashboard listing: live events, most recently edited first. */
export async function listEventSummaries(db: SeatingDb): Promise<EventSummary[]> {
  const records = await db.events.orderBy("updatedAt").reverse().toArray();
  return records.filter(isLive).map((record) => record.summary);
}

/** A dashboard tile: the summary plus who it's shared with (signed-in sync). */
export interface DashboardEvent {
  summary: EventSummary;
  role: EventRole;
  /** Owner's name, for events shared with you. */
  ownerName: string | null;
  /** People you shared it with (your own events). */
  memberCount: number;
}

/** Live events, newest first, with their sharing state. */
export async function listDashboardEvents(db: SeatingDb): Promise<DashboardEvent[]> {
  const records = await db.events.orderBy("updatedAt").reverse().toArray();
  return records.filter(isLive).map((record) => ({
    summary: record.summary,
    role: recordRole(record.sync),
    ownerName: record.sync.ownerName ?? null,
    memberCount: record.sync.memberCount ?? 0,
  }));
}

/** The document of a live event (null if missing, deleted or in the trash). */
export async function getEventDoc(db: SeatingDb, id: string): Promise<EventDoc | null> {
  const record = await db.events.get(id);
  return record && isLive(record) ? record.doc : null;
}

/** Stores a brand-new document. */
export async function createEvent(db: SeatingDb, doc: EventDoc): Promise<void> {
  await db.events.put(toRecord(doc, NEW_SYNC_META));
}

/**
 * Saves an edited document, stamping `updatedAt` and marking it dirty.
 * Returns the stored copy.
 *
 * An editor save is never dropped: if the record is missing (e.g. mid-way
 * through moving events into an account on sign-in, or removed by sync while
 * open), it's recreated as a new unsynced event. The one exception is a
 * pending-delete tombstone — the user deleted it deliberately — in which case
 * nothing is written and null is returned.
 */
export async function saveEventDoc(db: SeatingDb, doc: EventDoc): Promise<EventDoc | null> {
  return db.transaction("rw", db.events, async () => {
    const existing = await db.events.get(doc.id);
    if (existing?.sync.deleted) return null;
    const stamped = { ...doc, updatedAt: new Date().toISOString() };
    const sync = existing ? { ...existing.sync, dirty: true } : NEW_SYNC_META;
    // An editor still open on a trashed event (another tab) keeps it trashed.
    await db.events.put(toRecord(stamped, sync, existing?.trashedAt ?? null));
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

/** A trashed event, for the Trash page. */
export interface TrashedEvent {
  summary: EventSummary;
  trashedAt: string;
  /** When it will be deleted for good. */
  purgeAt: string;
}

/** Moves an event to the trash (restorable for TRASH_RETENTION_DAYS). */
export async function trashEvent(db: SeatingDb, id: string, now = new Date()): Promise<void> {
  await db.events.update(id, { trashedAt: now.toISOString() });
}

/** Takes an event back out of the trash. */
export async function restoreFromTrash(db: SeatingDb, id: string): Promise<void> {
  await db.events.update(id, { trashedAt: null });
}

/** Events in the trash, most recently trashed first. */
export async function listTrashedEvents(db: SeatingDb): Promise<TrashedEvent[]> {
  const records = await db.events.toArray();
  return records
    .filter((record) => record.trashedAt && !record.sync.deleted && record.doc)
    .map((record) => {
      const trashedAt = record.trashedAt as string;
      const purgeAt = new Date(Date.parse(trashedAt) + TRASH_RETENTION_DAYS * DAY_MS);
      return { summary: record.summary, trashedAt, purgeAt: purgeAt.toISOString() };
    })
    .sort((a, b) => b.trashedAt.localeCompare(a.trashedAt));
}

/** Permanently deletes events that have been in the trash too long. Returns how many. */
export async function purgeExpiredTrash(db: SeatingDb, now = new Date()): Promise<number> {
  const expired = (await listTrashedEvents(db)).filter(
    (event) => Date.parse(event.purgeAt) <= now.getTime(),
  );
  for (const event of expired) await deleteEvent(db, event.summary.id);
  return expired.length;
}

/**
 * Deletes an event for good, with its version history and images. (The UI moves events
 * to the trash first; this is "Delete forever" and the 30-day purge.)
 * Never-synced events are removed outright; synced ones become a tombstone
 * until the sync engine has deleted them on the server.
 */
export async function deleteEvent(db: SeatingDb, id: string): Promise<void> {
  await db.transaction("rw", [db.events, db.versions, db.images], async () => {
    const existing = await db.events.get(id);
    if (!existing) return;
    await db.versions.where("eventId").equals(id).delete();
    await db.images.where("eventId").equals(id).delete();
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
