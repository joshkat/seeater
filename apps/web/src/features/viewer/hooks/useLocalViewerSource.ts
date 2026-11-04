import type { EventDoc } from "@seating/shared";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";

import { getEventDoc } from "../../storage/repository/eventRepository";
import { getImage } from "../../storage/repository/imageRepository";
import { useStorageStore } from "../../storage/store/storageStore";
import type { ViewerImageSource } from "../lib/viewerImages";

export interface LocalViewerSource {
  /** undefined while loading; `doc: null` when missing (or unreadable: `failed`). */
  result: { doc: EventDoc | null; failed?: boolean } | undefined;
  images: ViewerImageSource;
}

/**
 * A local event for the read-only viewer: read straight from storage (live,
 * so sync pulls and other tabs show up) and never opened in the document
 * store — no saves, no undo history, no versions.
 */
export function useLocalViewerSource(eventId: string | undefined): LocalViewerSource {
  const db = useStorageStore((state) => state.db);
  const result = useLiveQuery(async () => {
    if (!eventId) return { doc: null };
    try {
      return { doc: await getEventDoc(db, eventId) };
    } catch (error) {
      console.error("Couldn’t read the event", error);
      return { doc: null, failed: true };
    }
  }, [db, eventId]);
  const images = useMemo<ViewerImageSource>(
    () => async (imageId) => {
      const record = await getImage(db, imageId);
      return record ? new Blob([record.data], { type: record.mimeType }) : null;
    },
    [db],
  );
  return { result, images };
}
