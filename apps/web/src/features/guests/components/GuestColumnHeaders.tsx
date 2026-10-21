import { GUEST_COLUMNS } from "../lib/guestColumns";
import { SelectCheckbox } from "./SelectCheckbox";

interface GuestColumnHeadersProps {
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
}

/** Column labels over the guest list, plus a select-all checkbox. */
export function GuestColumnHeaders({
  allSelected,
  someSelected,
  onToggleAll,
}: GuestColumnHeadersProps): JSX.Element {
  return (
    <div className="sticky top-0 z-[1] flex items-center gap-2 border border-transparent border-b-base-300 bg-base-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
      <SelectCheckbox
        checked={allSelected}
        indeterminate={someSelected && !allSelected}
        label={allSelected ? "Deselect all guests" : "Select all guests"}
        onToggle={onToggleAll}
        className="-my-1"
      />
      <span className="min-w-0 flex-1">Guest</span>
      <span className={`${GUEST_COLUMNS.rsvp} shrink-0 text-center max-sm:hidden`}>RSVP</span>
      <span className={`${GUEST_COLUMNS.actions} shrink-0`}>
        <span className="sr-only">Actions</span>
      </span>
    </div>
  );
}
