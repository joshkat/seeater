import { useEffect } from "react";

import { isTextEntry } from "../../../lib/isTextEntry";
import { useGuestDetailsStore } from "../../guests/store/guestDetailsStore";
import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import { useVersionDialogStore } from "../../versions/store/versionDialogStore";
import { useEditorStore } from "../store/editorStore";
import { redoEdit, undoEdit } from "../store/historyActions";

/** Editor keyboard shortcuts: undo (Cmd/Ctrl+Z), redo (Shift+Cmd/Ctrl+Z or
 * Ctrl+Y), delete, duplicate (Cmd/Ctrl+D), and Escape
 * (backs out of the placement dialog or a seating prompt if one is open,
 * otherwise clears the selection). */
export function useKeyboardShortcuts(): void {
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isTextEntry(event.target)) return;

      // Version history and guest details are modal too: Escape closes them,
      // nothing else applies.
      const versions = useVersionDialogStore.getState();
      if (versions.open) {
        if (event.key === "Escape") versions.setOpen(false);
        return;
      }
      const details = useGuestDetailsStore.getState();
      if (details.guestId) {
        if (event.key === "Escape") details.close();
        return;
      }
      // Any other open modal (e.g. New layout) handles its own keys.
      if (document.querySelector(".modal.modal-open")) return;

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

      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redoEdit();
        else undoEdit();
        return;
      }
      if (event.ctrlKey && !event.metaKey && key === "y") {
        event.preventDefault();
        redoEdit();
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
