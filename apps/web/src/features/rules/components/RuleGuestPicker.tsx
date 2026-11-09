import type { Guest, SeatingRule } from "@seating/shared";
import { useId, useMemo, useState } from "react";

/** How many search matches to list at once. */
const MAX_MATCHES = 8;

interface RuleGuestPickerProps {
  kind: SeatingRule["kind"];
  guests: Guest[];
  /** Adds the rule for these guests (at least two). */
  onAdd: (guestIds: string[]) => void;
  onCancel: () => void;
}

/** "+ Keep together / apart" inside the Rules dialog: search for guests, pick
 * two or more as chips, then add the rule. */
export function RuleGuestPicker({
  kind,
  guests,
  onAdd,
  onCancel,
}: RuleGuestPickerProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const searchId = useId();
  const byId = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return guests
      .filter((guest) => !picked.includes(guest.id) && guest.name.toLowerCase().includes(needle))
      .slice(0, MAX_MATCHES);
  }, [guests, picked, query]);

  const pick = (id: string): void => {
    setPicked([...picked, id]);
    setQuery("");
  };
  const title = kind === "together" ? "Keep together" : "Keep apart";

  return (
    <section
      aria-label={`New rule: ${title}`}
      className="flex flex-col gap-2 rounded-box border border-base-300 bg-base-200 p-3"
    >
      <label htmlFor={searchId} className="text-xs font-semibold">
        {title}: who? <span className="font-normal text-base-content/70">(at least 2)</span>
      </label>
      {picked.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {picked.map((id) => (
            <li key={id}>
              <button
                type="button"
                aria-label={`Remove ${byId.get(id)?.name ?? "guest"}`}
                className="badge badge-primary badge-soft gap-1 pointer-coarse:min-h-11"
                onClick={() => setPicked(picked.filter((other) => other !== id))}
              >
                {byId.get(id)?.name ?? "Guest"} <span aria-hidden>✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={searchId}
        autoFocus
        className="input input-sm w-full"
        placeholder="Type a name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches.length > 0) {
            event.preventDefault();
            pick(matches[0].id);
          }
        }}
      />
      {matches.length > 0 && (
        <ul aria-label="Matching guests" className="flex flex-wrap gap-1.5">
          {matches.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => pick(guest.id)}
              >
                + {guest.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() !== "" && matches.length === 0 && (
        <p className="text-xs text-base-content/70">No guest matches “{query.trim()}”.</p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={picked.length < 2}
          onClick={() => onAdd(picked)}
        >
          Add rule
        </button>
      </div>
    </section>
  );
}
