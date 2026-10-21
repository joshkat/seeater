import { useMemo } from "react";

import { useGuests } from "../../hooks/useDocumentSelectors";
import { CHAIR_COLOR_MODES, type ChairColorMode, legendFor } from "../../lib/chairColors";
import { useViewPrefsStore } from "../../store/viewPrefsStore";

/** Bottom-left of the canvas: what chair colours mean, and a picker for it. */
export function ChairColorLegend(): JSX.Element {
  const guests = useGuests();
  const mode = useViewPrefsStore((state) => state.chairColorMode);
  const setMode = useViewPrefsStore((state) => state.setChairColorMode);
  const seated = useMemo(() => guests.filter((guest) => guest.seatId), [guests]);
  const legend = useMemo(() => legendFor(seated, mode), [seated, mode]);

  return (
    <div className="absolute bottom-3 left-3 z-10 flex max-w-64 flex-col gap-1.5 rounded-box bg-base-100/90 p-2 text-xs text-base-content shadow">
      <label className="flex items-center gap-1.5">
        Colour chairs by
        <select
          aria-label="Colour chairs by"
          className="select select-xs w-auto"
          value={mode}
          onChange={(event) => setMode(event.target.value as ChairColorMode)}
        >
          {CHAIR_COLOR_MODES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {legend.length > 0 && (
        <ul
          aria-label="Chair colour legend"
          className="flex max-h-32 flex-col gap-0.5 overflow-y-auto max-sm:max-h-12 max-sm:flex-row max-sm:flex-wrap max-sm:gap-x-2"
        >
          {legend.map((entry) => (
            <li key={entry.label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-3 rounded-full"
                style={{ background: entry.color }}
              />
              <span className="truncate">{entry.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
