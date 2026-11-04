import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { Link, useParams } from "react-router";

import { EditorStatusScreen } from "../../editor/components/EditorStatusScreen";
import { getEventDoc } from "../../storage/repository/eventRepository";
import { getImage } from "../../storage/repository/imageRepository";
import { useStorageStore } from "../../storage/store/storageStore";
import type { ViewerImageSource } from "../lib/viewerImages";
import { EventViewer } from "./EventViewer";

/**
 * `/events/:eventId/view` — a local event, read-only. It reads the stored
 * document directly (live, so edits in another tab show up) and never opens it
 * in the document store: no saves, no undo history, no versions.
 */
export function ViewerRoute(): JSX.Element {
  const { eventId } = useParams();
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

  if (!result) return <EditorStatusScreen status="loading" />;
  if (!result.doc) return <EditorStatusScreen status={"failed" in result ? "error" : "missing"} />;
  return (
    <EventViewer
      doc={result.doc}
      images={images}
      nav={
        <Link to={`/events/${result.doc.id}`} className="btn btn-secondary btn-sm">
          ← Editor
        </Link>
      }
    />
  );
}
