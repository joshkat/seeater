import type { ArrivalFilter } from "../lib/checkInList";

const OPTIONS: { value: ArrivalFilter; label: string }[] = [
  { value: "waiting", label: "Not arrived" },
  { value: "arrived", label: "Arrived" },
  { value: "all", label: "Everyone" },
];

/** Not arrived / Arrived / Everyone. */
export function ArrivalFilterTabs({
  value,
  onChange,
}: {
  value: ArrivalFilter;
  onChange: (value: ArrivalFilter) => void;
}): JSX.Element {
  return (
    <div role="group" aria-label="Show" className="join">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={`btn join-item btn-sm ${value === option.value ? "btn-active btn-neutral" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
