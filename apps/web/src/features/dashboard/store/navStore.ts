import { create } from "zustand";

import { useDocumentStore } from "../../editor/store/documentStore";
import { useEditorStore } from "../../editor/store/editorStore";
import { useGuestStore } from "../../guests/store/guestStore";

type View = "dashboard" | "editor";

interface NavState {
  view: View;
  /** Open an event in the editor (loads it from local storage). */
  openEvent: (eventId: string) => void;
  /** Return to the events dashboard (saving any pending edits first). */
  goToDashboard: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  view: "dashboard",

  openEvent(eventId) {
    useGuestStore.getState().reset();
    useEditorStore.getState().resetForNewEvent();
    void useDocumentStore.getState().open(eventId);
    set({ view: "editor" });
  },

  goToDashboard() {
    void useDocumentStore.getState().close();
    set({ view: "dashboard" });
  },
}));
