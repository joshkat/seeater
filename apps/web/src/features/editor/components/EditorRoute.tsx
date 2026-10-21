import { useParams } from "react-router";

import { useOpenEvent } from "../hooks/useOpenEvent";
import { EditorPage } from "./EditorPage";
import { EditorStatusScreen } from "./EditorStatusScreen";

/** `/events/:eventId` — the editor for that event (opened while this route is mounted). */
export function EditorRoute(): JSX.Element {
  const { eventId } = useParams();
  const { ready, status } = useOpenEvent(eventId);
  return ready ? <EditorPage /> : <EditorStatusScreen status={status} />;
}
