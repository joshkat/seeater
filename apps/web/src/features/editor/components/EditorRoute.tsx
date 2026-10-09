import { useEffect } from "react";
import { useParams } from "react-router";

import { useGuestStore } from "../../guests/store/guestStore";
import { useDocumentStore } from "../store/documentStore";
import { useEditorStore } from "../store/editorStore";
import { EditorPage } from "./EditorPage";
import { EditorStatusScreen } from "./EditorStatusScreen";

/**
 * `/events/:eventId` — opens that event from local storage for the editor's
 * lifetime and saves + closes it on the way out.
 */
export function EditorRoute(): JSX.Element {
  const { eventId } = useParams();
  const status = useDocumentStore((state) => state.status);
  const openId = useDocumentStore((state) => state.doc?.id);

  useEffect(() => {
    if (!eventId) return;
    useGuestStore.getState().reset();
    useEditorStore.getState().resetForNewEvent();
    void useDocumentStore.getState().open(eventId);
    return () => {
      void useDocumentStore.getState().close();
    };
  }, [eventId]);

  // Guard on the id too, so a previous event never flashes while this one loads.
  if (status === "ready" && openId === eventId) return <EditorPage />;
  return <EditorStatusScreen status={status === "ready" ? "loading" : status} />;
}
