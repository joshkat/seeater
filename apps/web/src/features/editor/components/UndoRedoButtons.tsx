import { shortcutLabel } from "../../../lib/platform";
import { useHistoryAvailability } from "../hooks/useDocumentSelectors";
import { redoEdit, undoEdit } from "../store/historyActions";

interface UndoRedoButtonsProps {
  /** Keeps "Undo" visible everywhere (check-in, where an unlabelled ↶ on a
   * phone is easy to miss); otherwise the words show on wide screens only. */
  labelUndo?: boolean;
  /** False leaves Redo out (the editor's toolbar below xl has it in "⋯"). */
  showRedo?: boolean;
}

/** Toolbar undo / redo (the keyboard shortcuts do the same). */
export function UndoRedoButtons({
  labelUndo = false,
  showRedo = true,
}: UndoRedoButtonsProps): JSX.Element {
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
        ↶ <span className={labelUndo ? "" : "max-xl:hidden"}>Undo</span>
      </button>
      {showRedo && (
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
      )}
    </div>
  );
}
