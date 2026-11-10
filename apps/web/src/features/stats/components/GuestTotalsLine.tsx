import { guestTotals } from "@seating/shared";
import { useMemo } from "react";

import { useGuests } from "../../editor/hooks/useDocumentSelectors";

/** "12 of 40 seated", next to the guest panel's title. (Who still needs a seat
 * is the "To seat" tab's count.) */
export function GuestTotalsLine(): JSX.Element | null {
  const guests = useGuests();
  const totals = useMemo(() => {
    const seating = new Map<string, string>();
    for (const guest of guests) if (guest.seatId) seating.set(guest.id, guest.seatId);
    return guestTotals(guests, seating);
  }, [guests]);

  if (totals.total === 0) return null;

  return (
    <span className="mr-auto min-w-0 truncate text-xs text-base-content/70">
      <strong className="text-base-content">{totals.seated}</strong> of {totals.total} seated
    </span>
  );
}
