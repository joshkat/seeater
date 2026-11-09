import { useRef } from "react";

import { useModalFocus } from "../../../lib/useModalFocus";

interface LeaveEventDialogProps {
  name: string;
  ownerName: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirms removing an event someone shared with you from your list. */
export function LeaveEventDialog({
  name,
  ownerName,
  onConfirm,
  onClose,
}: LeaveEventDialogProps): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  useModalFocus(boxRef);

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-label={`Remove “${name}” from your list`}
      onClick={onClose}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <div
        ref={boxRef}
        className="modal-box flex max-w-sm flex-col gap-3 text-base-content"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold">Remove “{name}” from your list?</h3>
        <p className="text-sm text-base-content/70">
          It stays with {ownerName ?? "its owner"} and anyone else it's shared with. To get it back,
          ask them to share it with you again.
        </p>
        <div className="modal-action mt-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-error btn-sm" onClick={onConfirm}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
