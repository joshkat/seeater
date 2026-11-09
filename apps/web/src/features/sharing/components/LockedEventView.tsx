import type { LockHolder } from "@seating/shared";
import { Link } from "react-router";

import { EditorStatusScreen } from "../../editor/components/EditorStatusScreen";
import { EventViewer } from "../../viewer/components/EventViewer";
import { useLocalViewerSource } from "../../viewer/hooks/useLocalViewerSource";
import { EditLockBanner } from "./EditLockBanner";

interface LockedEventViewProps {
  eventId: string;
  holder: LockHolder;
  tookOver: boolean;
  onEditAnyway: () => void;
}

/** What the editor route shows while someone else holds the edit lock. */
export function LockedEventView({
  eventId,
  holder,
  tookOver,
  onEditAnyway,
}: LockedEventViewProps): JSX.Element {
  const { result, images } = useLocalViewerSource(eventId);
  if (!result) return <EditorStatusScreen status="loading" />;
  if (!result.doc) return <EditorStatusScreen status={result.failed ? "error" : "missing"} />;
  return (
    <EventViewer
      doc={result.doc}
      images={images}
      banner={<EditLockBanner holder={holder} tookOver={tookOver} onEditAnyway={onEditAnyway} />}
      nav={
        <Link to="/" className="btn btn-secondary btn-sm">
          ← Events
        </Link>
      }
    />
  );
}
