import { create } from "zustand";

import { useEditorStore } from "../../editor/store/editorStore";
import { useGuestStore } from "../../guests/store/guestStore";

type View = "dashboard" | "editor";

interface NavState {
  view: View;
  /** Open an event in the editor (loads its plan + isolates its guest list). */
  openEvent: (floorPlanId: string) => void;
  /** Return to the events dashboard. */
  goToDashboard: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  view: "dashboard",

  openEvent(floorPlanId) {
    // Clear the previous event's guests so lists never bleed across events,
    // then load the new plan and switch to the editor.
    useGuestStore.getState().reset();
    void useEditorStore.getState().loadFloorPlan(floorPlanId);
    set({ view: "editor" });
  },

  goToDashboard() {
    set({ view: "dashboard" });
  },
}));
