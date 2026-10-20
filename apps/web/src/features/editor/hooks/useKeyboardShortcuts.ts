import { useEffect } from "react";

import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import { useEditorStore } from "../store/editorStore";

/** Editor keyboard shortcuts: delete, duplicate (Cmd/Ctrl+D), and Escape
 * (backs out of the placement dialog or a seating prompt if one is open,
 * otherwise clears the selection). */
export function useKeyboardShortcuts(): void {
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      // The placement dialog is modal: only Escape (back out) applies.
      const { placement, updatePlacement, cancelPlacement } = useSeatingFlowStore.getState();
      if (placement) {
        if (event.key === "Escape") {
          if (placement.pending) updatePlacement((state) => ({ ...state, pending: null }));
          else if (placement.picked) updatePlacement((state) => ({ ...state, picked: null }));
          else cancelPlacement();
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (event.key === "Escape") {
        const seating = useSeatingFlowStore.getState();
        if (seating.question || seating.overflow) seating.dismiss();
        else clearSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, duplicateSelected, clearSelection]);
}
