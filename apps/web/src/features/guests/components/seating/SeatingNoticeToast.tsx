import { useEffect, useState } from "react";

import { type SeatingNotice, useSeatingFlowStore } from "../../store/seatingFlowStore";

/** How long a "Seated 4 at Table 2" confirmation stays up. */
const NOTICE_MS = 3500;
/** Notices with a button (Undo) stay longer, so there's time to reach it. */
const ACTION_NOTICE_MS = 8000;

/** A short-lived confirmation after an edit, optionally with an Undo-style
 * button. The timer pauses while the pointer or focus is on it. */
export function SeatingNoticeToast({ notice }: { notice: SeatingNotice }): JSX.Element {
  const clearNotice = useSeatingFlowStore((state) => state.clearNotice);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const { action } = notice;

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(clearNotice, action ? ACTION_NOTICE_MS : NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice.id, action, clearNotice, paused]);

  return (
    <div
      role="status"
      className="alert alert-success pointer-events-auto flex flex-wrap py-2 text-sm shadow-lg"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <span>{notice.text}</span>
      {action && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            action.run();
            clearNotice();
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
