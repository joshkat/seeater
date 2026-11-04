import type { SeatMatch } from "../lib/findSeat";

interface FindSeatResultProps {
  match: SeatMatch;
  picked: boolean;
  onPick: () => void;
}

/** One guest in the "Find your seat" results: name, then table and seat. */
export function FindSeatResult({ match, picked, onPick }: FindSeatResultProps): JSX.Element {
  return (
    <li>
      <button
        type="button"
        aria-pressed={picked}
        className={`flex w-full flex-col items-start rounded-box px-3 py-2 text-left hover:bg-base-200 ${
          picked ? "bg-primary/10 ring-1 ring-primary" : ""
        }`}
        onClick={onPick}
      >
        <span className="font-medium">{match.guest.name}</span>
        <span className="text-sm text-base-content/70">
          {match.tableName ? `${match.tableName} · seat ${match.seatNumber}` : "No seat yet"}
        </span>
      </button>
    </li>
  );
}
