import {
  type NewLayoutContent,
  addLayout,
  deleteLayout,
  renameLayout,
  switchLayout,
} from "@seating/shared";

import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import { useDocumentStore } from "./documentStore";
import { useEditorStore } from "./editorStore";
import { showUndoNotice } from "./historyActions";

/**
 * Layout actions as the user sees them. Each is one document edit (so
 * undoable); switching layouts also resets the view — the tables are
 * different — and closes seating prompts. The guest selection is kept, so
 * you can pick guests and then switch to the layout to seat them in.
 */
function afterLayoutChange(): void {
  const editor = useEditorStore.getState();
  editor.clearSelection();
  editor.resetView();
  useSeatingFlowStore.getState().dismiss();
}

export function switchToLayout(layoutId: string): void {
  useDocumentStore.getState().apply((doc) => switchLayout(doc, layoutId));
  afterLayoutChange();
}

export function createLayout(name: string, content: NewLayoutContent): void {
  useDocumentStore.getState().apply((doc) => addLayout(doc, name, content).doc);
  afterLayoutChange();
}

export function renameLayoutTo(layoutId: string, name: string): void {
  useDocumentStore.getState().apply((doc) => renameLayout(doc, layoutId, name));
}

export function removeLayout(layoutId: string, name: string): void {
  useDocumentStore.getState().apply((doc) => deleteLayout(doc, layoutId));
  afterLayoutChange();
  showUndoNotice(`Deleted the “${name}” layout.`);
}
