import { guestTotals } from "@seating/shared";
import { useMemo, useState } from "react";

import { useGuests } from "../../editor/hooks/useDocumentSelectors";
import { StatsDialog } from "./StatsDialog";

/** "12 of 40 seated · 5 still need a seat · 3 declined" + a Stats button. */
export function GuestTotalsLine(): JSX.Element | null {
  const guests = useGuests();
  const [open, setOpen] = useState(false);
  const totals = useMemo(() => {
    const seating = new Map<string, string>();
    for (const guest of guests) if (guest.seatId) seating.set(guest.id, guest.seatId);
    return guestTotals(guests, seating);
  }, [guests]);

  if (totals.total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-2 text-xs text-base-content/70">
      <span>
        <strong className="text-base-content">{totals.seated}</strong> of {totals.total} seated
        {totals.needSeat > 0 && (
          <>
            {" · "}
            <span className="text-warning">{totals.needSeat} still need a seat</span>
          </>
        )}
        {totals.declined > 0 && ` · ${totals.declined} declined`}
      </span>
      <button type="button" className="btn btn-ghost btn-xs" onClick={() => setOpen(true)}>
        Stats
      </button>
      {open && <StatsDialog onClose={() => setOpen(false)} />}
    </div>
  );
}
