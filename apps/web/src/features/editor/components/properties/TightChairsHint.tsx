import type { Table } from "@seating/shared";
import { comfortableSeatCount, comfortableSizeFor, isTightSeating } from "@seating/shared";

import { fromSmallUnit, toSmallUnit } from "../../lib/units";
import { useEditorStore } from "../../store/editorStore";

/** Size steps the "Make it…" suggestion rounds up to (inches or cm). */
const NICE_STEP = { imperial: 6, metric: 10 } as const;

interface TightChairsHintProps {
  table: Table;
  units: "metric" | "imperial";
}

/**
 * Under the chair count: a warning when the chairs are squeezed onto the
 * table, with a one-click resize that seats them all comfortably.
 */
export function TightChairsHint({ table, units }: TightChairsHintProps): JSX.Element | null {
  const resizeTable = useEditorStore((state) => state.resizeTable);
  const count = table.seats.length;
  if (!isTightSeating(table.shape, table.size, count)) return null;

  const comfortable = comfortableSeatCount(table.shape, table.size) ?? count;
  const isRound = table.shape === "round";
  const mark = units === "imperial" ? "″" : " cm";
  const step = NICE_STEP[units];
  const needed = comfortableSizeFor(table.shape, table.size, count).width;
  const niceWidth = Math.ceil(toSmallUnit(needed, units) / step) * step;
  const width = fromSmallUnit(niceWidth, units);
  const current = `${toSmallUnit(table.size.width, units)}${mark}`;

  return (
    // The warning colour is only on the icon: as text it's too light to read
    // on the light theme (UX-61).
    <div className="mt-1.5 flex flex-col items-start gap-1 text-xs text-base-content/80">
      <p>
        <span aria-hidden className="text-warning">
          ⚠{" "}
        </span>
        Tight: {isRound ? `a ${current} round` : "this table"} comfortably seats {comfortable}.
      </p>
      <button
        type="button"
        className="btn btn-xs pointer-coarse:min-h-11"
        onClick={() =>
          resizeTable(table.id, { width, height: isRound ? width : table.size.height })
        }
      >
        Make it {niceWidth}
        {mark}
        {isRound ? "" : " long"}
      </button>
    </div>
  );
}
