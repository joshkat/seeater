import { useParams } from "react-router";

import { useFollowMovedEvent } from "../../sync/hooks/useFollowMovedEvent";
import { useOpenEvent } from "../hooks/useOpenEvent";
import { EditorPage } from "./EditorPage";
import { EditorStatusScreen } from "./EditorStatusScreen";

const pathFor = (id: string) => `/events/${id}`;

/** `/events/:eventId` — the editor for that event (opened while this route is mounted). */
export function EditorRoute(): JSX.Element {
  const { eventId } = useParams();
  const { ready, status } = useOpenEvent(eventId);
  useFollowMovedEvent(eventId, pathFor);
  return ready ? <EditorPage /> : <EditorStatusScreen status={status} />;
}
