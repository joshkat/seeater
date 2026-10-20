import { shortcutLabel } from "../../../lib/platform";
import { useHistoryAvailability } from "../hooks/useDocumentSelectors";
import { redoEdit, undoEdit } from "../store/historyActions";

/** Toolbar undo / redo (the keyboard shortcuts do the same). */
export function UndoRedoButtons(): JSX.Element {
  const { canUndo, canRedo } = useHistoryAvailability();

  return (
    <div className="join">
      <button
        type="button"
        className="btn join-item btn-sm"
        disabled={!canUndo}
        aria-label="Undo"
        title={`Undo (${shortcutLabel("Z")})`}
        onClick={undoEdit}
      >
        ↶ <span className="max-xl:hidden">Undo</span>
      </button>
      <button
        type="button"
        className="btn join-item btn-sm"
        disabled={!canRedo}
        aria-label="Redo"
        title={`Redo (${shortcutLabel("Z", { shift: true })})`}
        onClick={redoEdit}
      >
        ↷ <span className="max-xl:hidden">Redo</span>
      </button>
    </div>
  );
}
