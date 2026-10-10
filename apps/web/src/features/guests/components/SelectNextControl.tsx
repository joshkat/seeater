import { DEFAULT_SEAT_COUNT, MAX_SEAT_COUNT } from "@seating/shared";
import { useState } from "react";

interface SelectNextControlProps {
  /** Selects the next `count` unassigned guests. */
  onSelectNext: (count: number) => void;
  disabled: boolean;
}

/** "Select next [8]" — grabs the next batch of unassigned guests, e.g. a
 * table's worth, ready to drop onto a table. */
export function SelectNextControl({ onSelectNext, disabled }: SelectNextControlProps): JSX.Element {
  const [count, setCount] = useState(DEFAULT_SEAT_COUNT);

  return (
    <div className="join">
      <button
        type="button"
        disabled={disabled}
        title="Select the next unassigned guests (skips declined)"
        className="btn join-item btn-xs"
        onClick={() => onSelectNext(count)}
      >
        Select next
      </button>
      <input
        type="number"
        min={1}
        max={MAX_SEAT_COUNT}
        aria-label="How many guests to select"
        className="input join-item input-xs w-12 text-base-content"
        value={count}
        onChange={(event) =>
          setCount(Math.max(1, Math.min(MAX_SEAT_COUNT, Number(event.target.value) || 1)))
        }
      />
    </div>
  );
}
