import { useEffect } from "react";

import { isTextEntry } from "../../../lib/isTextEntry";
import { useGuestDetailsStore } from "../../guests/store/guestDetailsStore";
import { usePrintStore } from "../../export/store/printStore";
import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import { useVersionDialogStore } from "../../versions/store/versionDialogStore";
import { useEditorStore } from "../store/editorStore";
import { useClipboardStore } from "../store/clipboardStore";
import { useLayoutStore } from "../store/layoutStore";
import { useShortcutsDialogStore } from "../store/shortcutsDialogStore";
import { redoEdit, undoEdit } from "../store/historyActions";

/** Arrow keys nudge the selection by this much (plan units: cm); Shift moves further. */
export const NUDGE_STEP = 10;
export const NUDGE_STEP_LARGE = 50;

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Editor keyboard shortcuts (listed in ShortcutsDialog — keep them in step):
 * undo (Cmd/Ctrl+Z), redo (Shift+Cmd/Ctrl+Z or Ctrl+Y), delete, duplicate
 * (Cmd/Ctrl+D), select all / copy / paste (Cmd/Ctrl+A/C/V), arrow-key nudge,
 * ? for the cheat sheet, and Escape (backs out of the placement dialog, a
 * seating prompt or an open drawer, otherwise clears the selection). */
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
      // The print view covers the editor: Escape closes it.
      const print = usePrintStore.getState();
      if (print.kind) {
        if (event.key === "Escape") print.close();
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

      const editor = useEditorStore.getState();
      const arrow = ARROWS[event.key];
      // Selects and sliders (e.g. image opacity) use the arrow keys themselves.
      const ownsArrows =
        event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement;
      if (arrow && !mod && !ownsArrows && editor.selectedIds.length > 0) {
        event.preventDefault();
        const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
        editor.nudgeSelected(arrow[0] * step, arrow[1] * step);
        return;
      }
      // Copy / paste only take over when they have something to do, so copying
      // ordinary text on the page still works.
      const canCopy = editor.selectedIds.length > 0;
      const canPaste = useClipboardStore.getState().items !== null;
      if (
        mod &&
        !event.shiftKey &&
        (key === "a" || (key === "c" && canCopy) || (key === "v" && canPaste))
      ) {
        event.preventDefault();
        if (key === "a") editor.selectAll();
        else if (key === "c") editor.copySelected();
        else editor.paste();
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        useShortcutsDialogStore.getState().setOpen(true);
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
        const layout = useLayoutStore.getState();
        if (seating.question || seating.overflow) seating.dismiss();
        else if (layout.guestsOpen || layout.propertiesOpen) layout.closeDrawers();
        else clearSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, duplicateSelected, clearSelection]);
}
