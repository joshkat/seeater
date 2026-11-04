import type { SeatMatch } from "../lib/findSeat";
import { FindSeatResult } from "./FindSeatResult";

interface FindSeatPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  matches: SeatMatch[];
  pickedId: string | null;
  onPick: (match: SeatMatch) => void;
}

/** "Find your seat": type a name, pick yourself, see your table on the chart. */
export function FindSeatPanel({
  query,
  onQueryChange,
  matches,
  pickedId,
  onPick,
}: FindSeatPanelProps): JSX.Element {
  const searching = query.trim() !== "";
  return (
    <section aria-labelledby="find-seat-heading" className="flex min-h-0 flex-col gap-2">
      <h2 id="find-seat-heading" className="font-semibold">
        Find your seat
      </h2>
      <input
        type="search"
        aria-label="Guest name"
        placeholder="Type your name…"
        className="input input-bordered w-full"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <p aria-live="polite" className="text-sm text-base-content/70">
        {!searching
          ? "Pick your name to see your table on the chart."
          : matches.length === 0
            ? `No guest called “${query.trim()}”.`
            : matches.length === 1
              ? "1 guest found."
              : `${matches.length} guests found.`}
      </p>
      {matches.length > 0 && (
        <ul
          aria-label="Search results"
          className="flex max-h-44 flex-col gap-1 overflow-y-auto lg:max-h-none"
        >
          {matches.map((match) => (
            <FindSeatResult
              key={match.guest.id}
              match={match}
              picked={match.guest.id === pickedId}
              onPick={() => onPick(match)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
