import { newId } from "@seating/shared";

import type { SeatingDb, StoredImageRecord } from "../db/SeatingDb";

/** Largest floor-plan image accepted (bytes). */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export interface NewImage {
  eventId: string;
  data: ArrayBuffer;
  mimeType: string;
  width: number;
  height: number;
}

/** Stores a picture and returns its id (referenced from the event's backdrop). */
export async function saveImage(db: SeatingDb, image: NewImage): Promise<string> {
  if (image.data.byteLength > MAX_IMAGE_BYTES) throw new Error("Image is too large");
  const record: StoredImageRecord = { id: newId(), createdAt: new Date().toISOString(), ...image };
  await db.images.add(record);
  return record.id;
}

export async function getImage(db: SeatingDb, id: string): Promise<StoredImageRecord | null> {
  return (await db.images.get(id)) ?? null;
}

/**
 * Deletes an event's images that no layout uses any more. Not run on every
 * change — undo may bring a removed image back — but on demand (e.g. when
 * the editor closes).
 */
export async function pruneImages(
  db: SeatingDb,
  eventId: string,
  inUse: string[],
): Promise<number> {
  const keep = new Set(inUse);
  const stale = (await db.images.where("eventId").equals(eventId).toArray()).filter(
    (image) => !keep.has(image.id),
  );
  await db.images.bulkDelete(stale.map((image) => image.id));
  return stale.length;
}
