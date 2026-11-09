import { useEffect } from "react";

import { isTextEntry } from "../../../lib/isTextEntry";
import { DRAWER_QUERY, matchesQuery } from "../../../lib/useMediaQuery";
import { useGuestDetailsStore } from "../../guests/store/guestDetailsStore";
import { usePrintStore } from "../../export/store/printStore";
import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import { useShareDialogStore } from "../../sharing/store/shareDialogStore";
import { useVersionDialogStore } from "../../versions/store/versionDialogStore";
import { nudgeSteps } from "../lib/nudge";
import { resolveUnits } from "../lib/units";
import { copySelection } from "../store/clipboardActions";
import { useClipboardStore } from "../store/clipboardStore";
import { useDocumentStore } from "../store/documentStore";
import { useEditorStore } from "../store/editorStore";
import { useLayoutStore } from "../store/layoutStore";
import { useShortcutsDialogStore } from "../store/shortcutsDialogStore";
import { redoEdit, undoEdit } from "../store/historyActions";

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
 * seating prompt, an open drawer or "Select several", otherwise clears the
 * selection). Each has a visible control too (toolbar, Select ▾). */
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
      const share = useShareDialogStore.getState();
      if (share.open) {
        if (event.key === "Escape") share.setOpen(false);
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
      // The placement dialog is modal too (it also uses .modal-open, so this comes
      // before the generic check below): only Escape (back out) applies.
      const { placement, updatePlacement, cancelPlacement } = useSeatingFlowStore.getState();
      if (placement) {
        if (event.key === "Escape") {
          if (placement.pending) updatePlacement((state) => ({ ...state, pending: null }));
          else if (placement.picked) updatePlacement((state) => ({ ...state, picked: null }));
          else cancelPlacement();
        }
        return;
      }

      // Any other open modal (e.g. New layout) handles its own keys.
      if (document.querySelector(".modal.modal-open")) return;

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
        // Arrow keys nudge by round numbers in the event's units (nudgeSteps).
        const units = resolveUnits(useDocumentStore.getState().doc?.settings.units ?? "auto");
        const { step: small, large } = nudgeSteps(units);
        const step = event.shiftKey ? large : small;
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
        else if (key === "c") copySelection();
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
        else if ((layout.guestsOpen || layout.propertiesOpen) && matchesQuery(DRAWER_QUERY)) {
          layout.closeDrawers();
        }
        // "Select several" ends first (keeping the selection), then it clears.
        else if (useEditorStore.getState().selectSeveral) {
          useEditorStore.getState().setSelectSeveral(false);
        } else clearSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, duplicateSelected, clearSelection]);
}
