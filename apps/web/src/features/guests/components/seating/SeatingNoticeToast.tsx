import { useEffect } from "react";

import { type SeatingNotice, useSeatingFlowStore } from "../../store/seatingFlowStore";

/** How long a "Seated 4 at Table 2" confirmation stays up. */
const NOTICE_MS = 3500;

/** A short-lived confirmation after a group was seated. */
export function SeatingNoticeToast({ notice }: { notice: SeatingNotice }): JSX.Element {
  const clearNotice = useSeatingFlowStore((state) => state.clearNotice);

  useEffect(() => {
    const timer = setTimeout(clearNotice, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice.id, clearNotice]);

  return (
    <div role="status" className="alert alert-success pointer-events-auto py-2 text-sm shadow-lg">
      {notice.text}
    </div>
  );
}
