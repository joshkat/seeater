import { type EventDoc, newId, summarizeEventDoc } from "@seating/shared";
import Dexie from "dexie";

import type { EventVersionRecord, SeatingDb, VersionKind } from "../db/SeatingDb";

/** Automatic versions kept per event (oldest pruned). Named ones are kept. */
export const AUTO_VERSION_LIMIT = 50;

/** Whether two documents have the same content, ignoring the save timestamp. */
export function sameContent(a: EventDoc, b: EventDoc): boolean {
  return JSON.stringify({ ...a, updatedAt: "" }) === JSON.stringify({ ...b, updatedAt: "" });
}

/** An event's versions, newest first. */
export async function listVersions(db: SeatingDb, eventId: string): Promise<EventVersionRecord[]> {
  return db.versions
    .where("[eventId+createdAt]")
    .between([eventId, Dexie.minKey], [eventId, Dexie.maxKey])
    .reverse()
    .toArray();
}

export async function getVersion(db: SeatingDb, id: string): Promise<EventVersionRecord | null> {
  return (await db.versions.get(id)) ?? null;
}

export async function deleteVersion(db: SeatingDb, id: string): Promise<void> {
  await db.versions.delete(id);
}

export interface SaveVersionOptions {
  kind: VersionKind;
  label: string;
  now?: Date;
}

/**
 * Saves a version of a document. An automatic version is skipped (returns
 * null) when the content matches the newest version already saved, and the
 * oldest automatic versions beyond AUTO_VERSION_LIMIT are pruned. Named
 * versions are always saved and never pruned.
 */
export async function saveVersion(
  db: SeatingDb,
  doc: EventDoc,
  { kind, label, now = new Date() }: SaveVersionOptions,
): Promise<EventVersionRecord | null> {
  return db.transaction("rw", db.versions, async () => {
    const versions = await listVersions(db, doc.id);
    if (kind === "auto" && versions[0] && sameContent(versions[0].doc, doc)) return null;

    const record: EventVersionRecord = {
      id: newId(),
      eventId: doc.id,
      createdAt: now.toISOString(),
      kind,
      label: label.trim().slice(0, 80) || (kind === "named" ? "Saved version" : "Autosave"),
      doc,
      summary: summarizeEventDoc(doc),
    };
    await db.versions.add(record);

    if (kind === "auto") {
      const autos = versions.filter((version) => version.kind === "auto");
      const excess = autos.slice(AUTO_VERSION_LIMIT - 1); // newest first; one was just added
      if (excess.length > 0) await db.versions.bulkDelete(excess.map((version) => version.id));
    }
    return record;
  });
}
