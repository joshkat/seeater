import type { Guest } from "@seating/shared";
import { useId, useMemo, useState } from "react";

/** How many matches to list at once. */
const MAX_MATCHES = 6;

interface PlacementAddGuestProps {
  /** Unseated guests not already in the dialog. */
  candidates: Guest[];
  onAdd: (guestId: string) => void;
}

/** "+ Add guest…" in the placement tray: find someone without a seat and
 * bring them into the dialog (still only applied on Confirm). */
export function PlacementAddGuest({ candidates, onAdd }: PlacementAddGuestProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchId = useId();

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return candidates
      .filter((guest) => guest.name.toLowerCase().includes(needle))
      .slice(0, MAX_MATCHES);
  }, [candidates, query]);

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm min-h-11 self-start"
        disabled={candidates.length === 0}
        title={candidates.length === 0 ? "Everyone else already has a seat" : undefined}
        onClick={() => setOpen(true)}
      >
        + Add guest…
      </button>
    );
  }

  const add = (id: string): void => {
    onAdd(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={searchId} className="text-xs font-semibold">
        Add someone without a seat
      </label>
      <div className="flex gap-1.5">
        <input
          id={searchId}
          autoFocus
          className="input input-sm min-w-0 flex-1"
          placeholder="Type a name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && matches.length > 0) {
              event.preventDefault();
              add(matches[0].id);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {matches.length > 0 ? (
        <ul aria-label="Guests without a seat" className="flex flex-wrap gap-1.5">
          {matches.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                className="btn btn-outline btn-xs pointer-coarse:min-h-11"
                onClick={() => add(guest.id)}
              >
                + {guest.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-base-content/70">No one without a seat matches.</p>
      )}
    </div>
  );
}
