import type { SeatingDb } from "../db/SeatingDb";

/**
 * Moves every event from one local database into another — used when someone
 * who has been working signed out signs in, so their events join (and sync to)
 * their account. Adopted events are marked never-synced + dirty so the next
 * sync uploads them. If the target already has the same id, the more recently
 * edited copy wins. Their floor-plan pictures move with them. Returns how
 * many events were moved.
 */
export async function adoptEvents(from: SeatingDb, to: SeatingDb): Promise<number> {
  const records = (await from.events.toArray()).filter((record) => !record.sync.deleted);
  if (records.length === 0) return 0;

  const eventIds = records.map((record) => record.id);
  const images = await from.images.where("eventId").anyOf(eventIds).toArray();

  await to.transaction("rw", to.events, to.images, async () => {
    // Pictures are write-once by id, so copying over an existing one is harmless.
    await to.images.bulkPut(images.map(({ uploadedTo: _uploadedTo, ...image }) => image));
    for (const record of records) {
      const existing = await to.events.get(record.id);
      if (existing && existing.updatedAt >= record.updatedAt) continue;
      await to.events.put({
        ...record,
        sync: existing
          ? { ...existing.sync, dirty: true, deleted: false }
          : { baseVersion: null, dirty: true, deleted: false },
      });
    }
  });

  // Only clear the source once the copy has committed.
  await from.events.bulkDelete(eventIds);
  await from.images.bulkDelete(images.map((image) => image.id));
  return records.length;
}
