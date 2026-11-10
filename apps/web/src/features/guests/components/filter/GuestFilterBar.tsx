import { useGuests, useHouseholds } from "../../../editor/hooks/useDocumentSelectors";
import { filterGuests } from "../../lib/guestFilter";
import { locateGuestSeat } from "../../lib/locateGuest";
import { useGuestFilterStore } from "../../store/guestFilterStore";

/** The guest search box, first thing in the guest panel. Enter shows the first
 * seated match on the map; Escape clears it. (Filters sit in the actions row.) */
export function GuestFilterBar(): JSX.Element {
  const guests = useGuests();
  const households = useHouseholds();
  const filter = useGuestFilterStore((state) => state.filter);
  const setFilter = useGuestFilterStore((state) => state.setFilter);

  const locateFirstMatch = (): void => {
    const first = filterGuests(guests, households, filter).find((guest) => guest.seatId);
    if (first?.seatId) locateGuestSeat(first.seatId);
  };

  return (
    <label className="input input-sm flex min-w-0 flex-1 items-center gap-1.5">
      <span aria-hidden className="text-base-content/60">
        ⌕
      </span>
      <input
        type="search"
        aria-label="Search guests"
        placeholder="Search guests…"
        className="min-w-0 grow"
        value={filter.query}
        onChange={(event) => setFilter({ query: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") locateFirstMatch();
          if (event.key === "Escape") setFilter({ query: "" });
        }}
      />
    </label>
  );
}
