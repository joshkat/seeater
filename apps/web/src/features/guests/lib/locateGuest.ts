import { useEditorStore } from "../../editor/store/editorStore";
import { useLayoutStore } from "../../editor/store/layoutStore";

/** "Show on map": zoom to a guest's chair (closing a tablet drawer that would cover it). */
export function locateGuestSeat(seatId: string): void {
  useLayoutStore.getState().closeDrawers();
  useEditorStore.getState().locateSeat(seatId);
}
