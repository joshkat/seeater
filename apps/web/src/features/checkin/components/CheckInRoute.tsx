import { useParams } from "react-router";

import { useFollowMovedEvent } from "../../sync/hooks/useFollowMovedEvent";
import { EditorStatusScreen } from "../../editor/components/EditorStatusScreen";
import { useOpenEvent } from "../../editor/hooks/useOpenEvent";
import { CheckInPage } from "./CheckInPage";

const pathFor = (id: string) => `/events/${id}/check-in`;

/** `/events/:eventId/check-in` — the door list for that event. */
export function CheckInRoute(): JSX.Element {
  const { eventId } = useParams();
  const { ready, status } = useOpenEvent(eventId);
  useFollowMovedEvent(eventId, pathFor);
  return ready ? <CheckInPage /> : <EditorStatusScreen status={status} />;
}
