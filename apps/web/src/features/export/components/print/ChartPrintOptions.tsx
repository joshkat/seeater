import { CHART_COLOR_MODES, type ChartColorMode } from "../../lib/chartScene";

interface ChartPrintOptionsProps {
  showNames: boolean;
  onShowNamesChange: (show: boolean) => void;
  color: ChartColorMode;
  onColorChange: (color: ChartColorMode) => void;
}

/** The chart's print options: names at chairs, and what chair colours mean. */
export function ChartPrintOptions({
  showNames,
  onShowNamesChange,
  color,
  onColorChange,
}: ChartPrintOptionsProps): JSX.Element {
  return (
    <>
      <label className="label cursor-pointer gap-1.5 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={showNames}
          onChange={(event) => onShowNamesChange(event.target.checked)}
        />
        Show names at chairs
      </label>
      <label className="flex items-center gap-1.5 text-sm">
        Colour
        <select
          aria-label="Colour chairs by"
          className="select select-sm w-auto"
          value={color}
          onChange={(event) => onColorChange(event.target.value as ChartColorMode)}
        >
          {CHART_COLOR_MODES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
