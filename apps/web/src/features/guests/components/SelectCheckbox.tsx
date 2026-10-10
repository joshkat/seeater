import { GUEST_COLUMNS } from "../lib/guestColumns";

interface SelectCheckboxProps {
  checked: boolean;
  /** Some, but not all, of what this box stands for is selected. */
  indeterminate?: boolean;
  label: string;
  /** `range` is true when Shift was held. */
  onToggle: (range: boolean) => void;
  /** Extra classes for the hit area, e.g. negative margins to reach the row's edges. */
  className?: string;
}

/**
 * The guest list's selection checkbox: ticking it adds to (or removes from)
 * the selection without needing ⌘/Ctrl. The whole cell is the hit target (the
 * full row height), not just the box, so it's easy to hit without a precise
 * pointer. Keyboard Space on the box still works: its click bubbles here.
 */
export function SelectCheckbox({
  checked,
  indeterminate = false,
  label,
  onToggle,
  className = "",
}: SelectCheckboxProps): JSX.Element {
  return (
    <span
      title={label}
      onClick={(event) => {
        // The row's own click handler would replace the selection.
        event.stopPropagation();
        onToggle(event.shiftKey);
      }}
      className={`${GUEST_COLUMNS.select} flex shrink-0 cursor-pointer items-center justify-center self-stretch ${className}`}
    >
      <input
        type="checkbox"
        aria-label={label}
        className="checkbox checkbox-primary pointer-events-none"
        checked={checked}
        readOnly
        ref={(element) => {
          if (element) element.indeterminate = indeterminate;
        }}
      />
    </span>
  );
}
