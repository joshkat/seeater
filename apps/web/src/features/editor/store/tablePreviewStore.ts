import { create } from "zustand";

import { panToShow } from "../geometry/panToShow";
import { useDocumentStore } from "./documentStore";
import { useEditorStore } from "./editorStore";

/**
 * A table pointed at from outside the canvas (the overflow prompt's table
 * chips): the canvas highlights it, and it's panned into view if hidden.
 * View state only; nothing is selected and nothing zooms.
 */
interface TablePreviewState {
  tableId: string | null;
  /** Highlights a table and pans to it if it's off-screen or under the
   * bottom `bottomInset` px (the prompt that's pointing at it). */
  preview: (tableId: string, bottomInset?: number) => void;
  clear: () => void;
}

export const useTablePreviewStore = create<TablePreviewState>((set) => ({
  tableId: null,

  preview(tableId, bottomInset = 0) {
    set({ tableId });
    const table = useDocumentStore.getState().doc?.tables.find((t) => t.id === tableId);
    const editor = useEditorStore.getState();
    if (!table || !editor.stageSize.width) return;
    const next = panToShow(editor.viewport, editor.stageSize, table, bottomInset);
    if (next !== editor.viewport) editor.setViewport(next);
  },

  clear() {
    set({ tableId: null });
  },
}));
