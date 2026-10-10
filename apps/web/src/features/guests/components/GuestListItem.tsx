import type { Guest, RsvpStatus } from "@seating/shared";

import { setGuestDragData } from "../lib/dnd";
import { GUEST_COLUMNS } from "../lib/guestColumns";
import { type SelectModifiers, selectModifiers } from "../lib/selectModifiers";
import { RsvpControl } from "./RsvpControl";
import { SelectCheckbox } from "./SelectCheckbox";

interface GuestListItemProps {
  guest: Guest;
  /** Secondary line: seat location when seated, else email/phone. */
  subtitle: string | null;
  selected: boolean;
  /** Shown under a household header (indented). */
  nested?: boolean;
  /** `additive`: ctrl/cmd was held or the checkbox was used (toggle).
   * `range`: shift was held. */
  onSelect: (modifiers: SelectModifiers) => void;
  onSetRsvp: (status: RsvpStatus) => void;
  onUnseat: () => void;
  onRemove: () => void;
}

/** A single guest row: a selection checkbox, draggable onto a seat, clickable
 * for click-to-assign, with a segmented RSVP control and seat/remove buttons. */
export function GuestListItem({
  guest,
  subtitle,
  selected,
  nested = false,
  onSelect,
  onSetRsvp,
  onUnseat,
  onRemove,
}: GuestListItemProps): JSX.Element {
  const declined = guest.rsvpStatus === "declined";

  return (
    <li
      draggable
      onDragStart={(event) => setGuestDragData(event.dataTransfer, guest.id)}
      onClick={(event) => onSelect(selectModifiers(event))}
      title="Tick the box to pick several (or ⌘/Ctrl-click), Shift-click for a range, then drag onto a table or pick a seat"
      className={`flex cursor-grab select-none items-center gap-2 rounded-field border py-1.5 pr-2 ${
        nested ? "pl-6" : "pl-2"
      } ${selected ? "border-primary bg-primary/5" : "border-transparent"}`}
    >
      <SelectCheckbox
        checked={selected}
        label={`Select ${guest.name}`}
        onToggle={(range) => onSelect({ additive: true, range })}
        className="-my-1.5"
      />

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13px] ${
            declined ? "text-base-content/40 line-through" : "text-base-content"
          }`}
        >
          {guest.name}
        </span>
        {subtitle && (
          <span className="block truncate text-[11px] text-base-content/60">{subtitle}</span>
        )}
      </span>

      <div className={`${GUEST_COLUMNS.rsvp} flex shrink-0 justify-center`}>
        <RsvpControl status={guest.rsvpStatus} onChange={onSetRsvp} />
      </div>

      <div className={`${GUEST_COLUMNS.actions} flex shrink-0 justify-end`}>
        {guest.seatId && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onUnseat();
            }}
            title="Remove from seat"
            className={iconButtonClass}
          >
            ⤺
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          title="Delete guest"
          className={iconButtonClass}
        >
          ×
        </button>
      </div>
    </li>
  );
}

const iconButtonClass =
  "btn btn-ghost btn-sm size-[30px] shrink-0 p-0 text-base text-base-content/40";
