import { useParams } from "react-router";

import { EditorStatusScreen } from "../../editor/components/EditorStatusScreen";
import { useOpenEvent } from "../../editor/hooks/useOpenEvent";
import { CheckInPage } from "./CheckInPage";

/** `/events/:eventId/check-in` — the door list for that event. */
export function CheckInRoute(): JSX.Element {
  const { eventId } = useParams();
  const { ready, status } = useOpenEvent(eventId);
  return ready ? <CheckInPage /> : <EditorStatusScreen status={status} />;
}
