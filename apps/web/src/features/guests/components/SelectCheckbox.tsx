interface SelectCheckboxProps {
  checked: boolean;
  /** Some, but not all, of what this box stands for is selected. */
  indeterminate?: boolean;
  label: string;
  /** `range` is true when Shift was held. */
  onToggle: (range: boolean) => void;
}

/** The guest list's selection checkbox: ticking it adds to (or removes from)
 * the selection without needing ⌘/Ctrl. */
export function SelectCheckbox({
  checked,
  indeterminate = false,
  label,
  onToggle,
}: SelectCheckboxProps): JSX.Element {
  return (
    <input
      type="checkbox"
      aria-label={label}
      title={label}
      className="checkbox checkbox-primary checkbox-sm"
      checked={checked}
      readOnly
      ref={(element) => {
        if (element) element.indeterminate = indeterminate;
      }}
      onClick={(event) => {
        // The row's own click handler would replace the selection.
        event.stopPropagation();
        onToggle(event.shiftKey);
      }}
    />
  );
}
