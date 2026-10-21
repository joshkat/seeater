import { backdropImageIds, parseEventDoc } from "@seating/shared";

import type { SeatingDb } from "../db/SeatingDb";
import { getEventDoc } from "./eventRepository";
import { pruneImages } from "./imageRepository";
import { listVersions } from "./versionRepository";

/**
 * Deletes an event's floor-plan pictures that neither the event nor any of
 * its saved versions uses (so restoring a version never loses its picture).
 * Run when the editor closes, after undo history is gone.
 */
export async function pruneUnusedImages(db: SeatingDb, eventId: string): Promise<number> {
  const doc = await getEventDoc(db, eventId);
  if (!doc) return 0;
  const inUse = new Set(backdropImageIds(doc));
  for (const version of await listVersions(db, eventId)) {
    try {
      for (const id of backdropImageIds(parseEventDoc(version.doc))) inUse.add(id);
    } catch {
      // An unreadable version can't be restored anyway.
    }
  }
  return pruneImages(db, eventId, [...inUse]);
}
