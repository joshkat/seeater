import { useEffect } from "react";

import { usePrintStore } from "../../export/store/printStore";
import { useGuestDetailsStore } from "../../guests/store/guestDetailsStore";
import { useGuestStore } from "../../guests/store/guestStore";
import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import { pruneUnusedImages } from "../../storage/repository/imageCleanup";
import { activeDb } from "../../storage/store/storageStore";
import { useVersionDialogStore } from "../../versions/store/versionDialogStore";
import { useDocumentStore } from "../store/documentStore";
import { useEditorStore } from "../store/editorStore";

/**
 * Opens an event from local storage for the calling route's lifetime (resetting
 * per-event UI state) and saves + closes it on the way out. Returns whether
 * that event is open and ready.
 */
export function useOpenEvent(eventId: string | undefined): {
  ready: boolean;
  status: "idle" | "loading" | "missing" | "error";
} {
  const status = useDocumentStore((state) => state.status);
  const openId = useDocumentStore((state) => state.doc?.id);

  useEffect(() => {
    if (!eventId) return;
    useGuestStore.getState().reset();
    useSeatingFlowStore.getState().reset();
    useVersionDialogStore.getState().setOpen(false);
    useGuestDetailsStore.getState().close();
    usePrintStore.getState().close();
    useEditorStore.getState().resetForNewEvent();
    void useDocumentStore.getState().open(eventId);
    return () => {
      void useDocumentStore
        .getState()
        .close()
        .then(() => pruneUnusedImages(activeDb(), eventId))
        .catch((error) => console.error("Image clean-up failed", error));
    };
  }, [eventId]);

  // Guard on the id too, so a previous event never flashes while this one loads.
  const ready = status === "ready" && openId === eventId;
  return { ready, status: status === "ready" ? "loading" : status };
}
