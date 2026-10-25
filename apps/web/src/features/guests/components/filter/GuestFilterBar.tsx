import { useGuestFilterStore } from "../../store/guestFilterStore";
import { GuestFilterMenu } from "./GuestFilterMenu";

interface GuestFilterBarProps {
  /** Enter in the search box: show the first match on the map. */
  onLocateFirst: () => void;
}

/** Search box + Filters for the guest list. */
export function GuestFilterBar({ onLocateFirst }: GuestFilterBarProps): JSX.Element {
  const query = useGuestFilterStore((state) => state.filter.query);
  const setFilter = useGuestFilterStore((state) => state.setFilter);

  return (
    <div className="flex items-center gap-1.5">
      <label className="input input-sm flex flex-1 items-center gap-1.5">
        <span aria-hidden className="text-base-content/60">
          ⌕
        </span>
        <input
          type="search"
          aria-label="Search guests"
          placeholder="Search name, meal, tag, notes…"
          className="grow"
          value={query}
          onChange={(event) => setFilter({ query: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") onLocateFirst();
            if (event.key === "Escape") setFilter({ query: "" });
          }}
        />
      </label>
      <GuestFilterMenu />
    </div>
  );
}
