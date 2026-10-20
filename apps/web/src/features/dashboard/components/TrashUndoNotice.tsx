import { useEffect } from "react";

import { restoreFromTrash } from "../../storage/repository/eventRepository";
import { activeDb } from "../../storage/store/storageStore";

/** How long the "moved to trash · Undo" banner stays. */
const NOTICE_MS = 8000;

interface TrashUndoNoticeProps {
  event: { id: string; name: string };
  onDone: () => void;
}

/** Banner after moving an event to the trash, with a one-click Undo. */
export function TrashUndoNotice({ event, onDone }: TrashUndoNoticeProps): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDone, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [event.id, onDone]);

  return (
    <div role="status" className="alert mb-4 flex justify-between py-2 text-sm">
      <span>“{event.name}” moved to the trash. It’s deleted for good after 30 days.</span>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          void restoreFromTrash(activeDb(), event.id);
          onDone();
        }}
      >
        Undo
      </button>
    </div>
  );
}
