import type { LegendEntry } from "../../../editor/lib/chairColors";

interface ChartLegendProps {
  title: string;
  entries: LegendEntry[];
}

/** What the chair colours mean, printed under the chart. The swatches are
 * SVG so they print even when the browser leaves out background colours. */
export function ChartLegend({ title, entries }: ChartLegendProps): JSX.Element {
  return (
    <ul aria-label={title} className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
      {entries.map((entry) => (
        <li key={entry.label} className="flex items-center gap-1.5">
          <svg aria-hidden viewBox="0 0 10 10" className="size-3">
            <circle cx={5} cy={5} r={4.5} fill={entry.color} />
          </svg>
          {entry.label}
        </li>
      ))}
    </ul>
  );
}
