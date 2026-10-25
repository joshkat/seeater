import { useGuestStore } from "../../guests/store/guestStore";
import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import { useDocumentStore } from "./documentStore";
import { useEditorStore } from "./editorStore";

/**
 * Undo / redo as the user sees it: step the document, then tidy up state
 * that pointed at the version just left (selected tables or guests that no
 * longer exist, an open seating prompt). Disabled while the placement dialog
 * is open — its working copy belongs to the current version.
 */
function step(direction: "undo" | "redo"): boolean {
  if (useSeatingFlowStore.getState().placement) return false;
  const documents = useDocumentStore.getState();
  const changed = direction === "undo" ? documents.undo() : documents.redo();
  if (!changed) return false;
  pruneStaleSelections();
  useSeatingFlowStore.getState().dismiss();
  return true;
}

/** Drops selected tables/guests that no longer exist in the open document
 * (after an undo, redo or version restore). */
export function pruneStaleSelections(): void {
  const doc = useDocumentStore.getState().doc;
  if (!doc) return;
  const tableIds = new Set(doc.tables.map((table) => table.id));
  const guestIds = new Set(doc.guests.map((guest) => guest.id));

  const { selectedIds, setSelection } = useEditorStore.getState();
  const tables = selectedIds.filter((id) => tableIds.has(id));
  if (tables.length !== selectedIds.length) setSelection(tables);

  const { selectedGuestIds, setGuestSelection } = useGuestStore.getState();
  const guests = selectedGuestIds.filter((id) => guestIds.has(id));
  if (guests.length !== selectedGuestIds.length) setGuestSelection(guests);
}

export function undoEdit(): boolean {
  return step("undo");
}

export function redoEdit(): boolean {
  return step("redo");
}

/** A notice with an Undo button (works on touch screens, where ⌘Z doesn't). */
export function showUndoNotice(text: string): void {
  useSeatingFlowStore.getState().showNotice(text, { label: "Undo", run: undoEdit });
}
