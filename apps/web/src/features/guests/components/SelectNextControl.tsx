import { DEFAULT_SEAT_COUNT, MAX_SEAT_COUNT } from "@seating/shared";
import { useState } from "react";

import { NumberField } from "../../../components/NumberField";

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
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        title="Select the next unassigned guests (skips declined)"
        className="btn btn-xs"
        onClick={() => onSelectNext(count)}
      >
        Select next
      </button>
      <NumberField
        size="xs"
        min={1}
        max={MAX_SEAT_COUNT}
        aria-label="How many guests to select"
        className="w-24 pointer-coarse:w-36"
        value={count}
        onChange={setCount}
      />
    </div>
  );
}
