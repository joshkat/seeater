import { Navigate, useParams } from "react-router";

import { LockedEventView } from "../../sharing/components/LockedEventView";
import { useEditLock } from "../../sharing/hooks/useEditLock";
import { useEventAccess } from "../../sharing/hooks/useEventAccess";
import { useFollowMovedEvent } from "../../sync/hooks/useFollowMovedEvent";
import { useOpenEvent } from "../hooks/useOpenEvent";
import { EditorPage } from "./EditorPage";
import { EditorStatusScreen } from "./EditorStatusScreen";

const pathFor = (id: string) => `/events/${id}`;

/**
 * `/events/:eventId` — the editor for that event (opened while this route is
 * mounted). Viewers of a shared event go to the read-only view; while someone
 * else is editing a shared event, it shows read-only with "Edit anyway".
 */
export function EditorRoute(): JSX.Element {
  const { eventId } = useParams();
  const { ready, status } = useOpenEvent(eventId);
  useFollowMovedEvent(eventId, pathFor);
  const access = useEventAccess(eventId);
  const lock = useEditLock(eventId);

  if (eventId && access?.role === "viewer") {
    return <Navigate to={`/events/${eventId}/view`} replace />;
  }
  if (eventId && (lock.state.kind === "blocked" || lock.state.kind === "lost")) {
    return (
      <LockedEventView
        eventId={eventId}
        holder={lock.state.holder}
        tookOver={lock.state.kind === "lost"}
        onEditAnyway={lock.editAnyway}
      />
    );
  }
  if (!ready || lock.state.kind === "checking") {
    return <EditorStatusScreen status={status} />;
  }
  return <EditorPage />;
}
