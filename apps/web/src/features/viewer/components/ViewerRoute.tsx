import { Link, useParams } from "react-router";

import { EditorStatusScreen } from "../../editor/components/EditorStatusScreen";
import { useEventAccess } from "../../sharing/hooks/useEventAccess";
import { useLocalViewerSource } from "../hooks/useLocalViewerSource";
import { EventViewer } from "./EventViewer";
import { SharedByBanner } from "./SharedByBanner";

/**
 * `/events/:eventId/view` — a local event, read-only. Where viewers of a
 * shared event land; owners and editors can go on to the editor.
 */
export function ViewerRoute(): JSX.Element {
  const { eventId } = useParams();
  const { result, images } = useLocalViewerSource(eventId);
  const access = useEventAccess(eventId);

  if (!result) return <EditorStatusScreen status="loading" />;
  if (!result.doc) return <EditorStatusScreen status={result.failed ? "error" : "missing"} />;
  const viewOnly = access?.role === "viewer";
  return (
    <EventViewer
      doc={result.doc}
      images={images}
      banner={viewOnly ? <SharedByBanner ownerName={access.ownerName} /> : undefined}
      nav={
        viewOnly ? (
          <Link to="/" className="btn btn-sm">
            ← Events
          </Link>
        ) : (
          <Link to={`/events/${result.doc.id}`} className="btn btn-sm">
            ← Editor
          </Link>
        )
      }
    />
  );
}
