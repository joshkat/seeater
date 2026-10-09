import { useState } from "react";

import { duplicateEvent } from "../../storage/repository/eventRepository";
import { activeDb } from "../../storage/store/storageStore";

interface DuplicateDialogProps {
  sourceId: string;
  sourceName: string;
  onClose: () => void;
}

/** Modal to duplicate an event: layout always copies; guests + their seat
 * assignments are opt-in via checkboxes. */
export function DuplicateDialog({
  sourceId,
  sourceName,
  onClose,
}: DuplicateDialogProps): JSX.Element {
  const [copyGuests, setCopyGuests] = useState(false);
  const [copyAssignments, setCopyAssignments] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDuplicate(): Promise<void> {
    setBusy(true);
    try {
      await duplicateEvent(activeDb(), sourceId, {
        copyGuests,
        copyAssignments: copyGuests && copyAssignments,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-box border border-base-300 bg-base-100 p-5 text-base-content shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold">Duplicate “{sourceName}”</h3>
        <p className="mt-1 text-sm text-base-content/60">
          The table layout is always copied into a new event.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={copyGuests}
              onChange={(event) => setCopyGuests(event.target.checked)}
            />
            Copy guest list (names, contacts, RSVP)
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${
              copyGuests ? "cursor-pointer" : "cursor-not-allowed opacity-40"
            }`}
          >
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              disabled={!copyGuests}
              checked={copyGuests && copyAssignments}
              onChange={(event) => setCopyAssignments(event.target.checked)}
            />
            Keep guests in their seats
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => void handleDuplicate()}
            disabled={busy}
          >
            {busy ? "Duplicating…" : "Duplicate"}
          </button>
        </div>
      </div>
    </div>
  );
}
