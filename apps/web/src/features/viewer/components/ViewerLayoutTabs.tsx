import type { LayoutView } from "@seating/shared";

interface ViewerLayoutTabsProps {
  views: LayoutView[];
  value: string;
  onChange: (layoutId: string) => void;
}

/** One tab per layout (ceremony, reception…); only shown when there are several. */
export function ViewerLayoutTabs({ views, value, onChange }: ViewerLayoutTabsProps): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Layouts"
      className="tabs tabs-box tabs-sm w-fit max-w-full overflow-x-auto"
    >
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={view.id === value}
          className={`tab whitespace-nowrap ${view.id === value ? "tab-active" : ""}`}
          onClick={() => onChange(view.id)}
        >
          {view.name}
        </button>
      ))}
    </div>
  );
}
