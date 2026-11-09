interface ReplaceConfirmProps {
  moverName: string;
  occupantName: string;
  seatNumber: number;
  canSwap: boolean;
  onChoose: (choice: "swap" | "replace" | "cancel") => void;
}

/** "Seat 3 is Walter's" — asked before anyone is bumped from a chair. */
export function ReplaceConfirm({
  moverName,
  occupantName,
  seatNumber,
  canSwap,
  onChoose,
}: ReplaceConfirmProps): JSX.Element {
  return (
    <div
      role="alertdialog"
      aria-label="Chair is taken"
      className="alert alert-warning flex-wrap py-2 text-sm"
    >
      <span className="flex-1">
        Seat {seatNumber} is <strong>{occupantName}</strong>’s.{" "}
        {canSwap
          ? `Swap them with ${moverName}, or move ${occupantName} to “To place”?`
          : `Move ${occupantName} to “To place” and seat ${moverName} here?`}
      </span>
      <div className="flex gap-1.5">
        <button type="button" className="btn btn-sm" onClick={() => onChoose("cancel")}>
          Cancel
        </button>
        {canSwap && (
          <button type="button" className="btn btn-sm" onClick={() => onChoose("swap")}>
            Swap
          </button>
        )}
        <button
          type="button"
          autoFocus
          className="btn btn-primary btn-sm"
          onClick={() => onChoose("replace")}
        >
          Replace
        </button>
      </div>
    </div>
  );
}
