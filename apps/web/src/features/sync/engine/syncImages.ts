import { backdropImageIds } from "@seating/shared";

import { type SeatingDb, recordRole } from "../../storage/db/SeatingDb";
import type { SyncApi } from "../api/syncApi";

export interface ImageSyncReport {
  uploaded: number;
  downloaded: number;
}

/**
 * Floor-plan pictures live outside the document (the `images` store), so
 * they sync separately after the documents:
 *
 * - **Up:** for each event this account can write that the server knows
 *   about, every picture it uses that hasn't gone to that event yet.
 * - **Down:** every picture an event uses that this device doesn't have.
 *
 * Images never change under one id, so there's nothing to reconcile. A
 * failure on one image doesn't stop the others; it's retried next pass.
 * Offline errors propagate (the scheduler reports "offline").
 */
export async function syncImages(db: SeatingDb, api: SyncApi): Promise<ImageSyncReport> {
  const report: ImageSyncReport = { uploaded: 0, downloaded: 0 };
  const records = await db.events.toArray();

  for (const record of records) {
    if (!record.doc || record.sync.deleted || record.sync.baseVersion === null) continue;
    const writable = recordRole(record.sync) !== "viewer";

    for (const imageId of new Set(backdropImageIds(record.doc))) {
      const local = await db.images.get(imageId);

      if (!local) {
        const remote = await tolerate(() => api.downloadImage(record.id, imageId));
        if (!remote) continue;
        await db.images.put({
          id: imageId,
          eventId: record.id,
          data: remote.data,
          mimeType: remote.mimeType,
          width: remote.width,
          height: remote.height,
          createdAt: new Date().toISOString(),
          uploadedTo: [record.id],
        });
        report.downloaded += 1;
        continue;
      }

      if (!writable || local.uploadedTo?.includes(record.id)) continue;
      const sent = await tolerate(async () => {
        await api.uploadImage(record.id, imageId, local);
        return true;
      });
      if (!sent) continue;
      await db.images.update(imageId, { uploadedTo: [...(local.uploadedTo ?? []), record.id] });
      report.uploaded += 1;
    }
  }
  return report;
}

/** Runs one image transfer; server-side refusals are skipped, network errors rethrown. */
async function tolerate<T>(transfer: () => Promise<T | null>): Promise<T | null> {
  try {
    return await transfer();
  } catch (error) {
    if (error instanceof TypeError) throw error; // offline
    console.warn("Image sync skipped", error);
    return null;
  }
}
