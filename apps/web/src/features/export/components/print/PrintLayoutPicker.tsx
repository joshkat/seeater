import type { LayoutView } from "@seating/shared";

interface PrintLayoutPickerProps {
  views: LayoutView[];
  value: string;
  onChange: (layoutId: string) => void;
}

/** "Layout [Reception ▾]" in the print toolbar (events with several layouts). */
export function PrintLayoutPicker({ views, value, onChange }: PrintLayoutPickerProps): JSX.Element {
  return (
    <label className="flex items-center gap-1.5 text-sm">
      Layout
      <select
        aria-label="Layout"
        className="select select-sm w-auto"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {views.map((view) => (
          <option key={view.id} value={view.id}>
            {view.name}
          </option>
        ))}
      </select>
    </label>
  );
}
