import type { Guest, RsvpStatus } from "@seating/shared";

import { setGuestDragData } from "../lib/dnd";
import { guestColor, guestInitials } from "../lib/guestDisplay";
import { type SelectModifiers, selectModifiers } from "../lib/selectModifiers";
import { RsvpControl } from "./RsvpControl";

interface GuestListItemProps {
  guest: Guest;
  /** Secondary line: seat location when seated, else email/phone. */
  subtitle: string | null;
  selected: boolean;
  /** `additive`: ctrl/cmd was held (toggle). `range`: shift was held. */
  onSelect: (modifiers: SelectModifiers) => void;
  onSetRsvp: (status: RsvpStatus) => void;
  onUnseat: () => void;
  onRemove: () => void;
}

/** A single guest row: draggable onto a seat, clickable for click-to-assign,
 * with a segmented RSVP control and seat/remove buttons. */
export function GuestListItem({
  guest,
  subtitle,
  selected,
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
      title="Click to select (⌘/Ctrl-click to add, Shift-click for a range), then drag onto a table or pick a seat"
      className={`flex cursor-grab select-none items-center gap-2 rounded-field border px-2 py-1.5 ${
        selected ? "border-primary bg-primary/5" : "border-transparent"
      }`}
    >
      <span
        aria-hidden
        className="grid size-[26px] shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
        style={{ background: guestColor(guest.id) }}
      >
        {guestInitials(guest.name)}
      </span>

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

      <RsvpControl status={guest.rsvpStatus} onChange={onSetRsvp} />

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
    </li>
  );
}

const iconButtonClass =
  "btn btn-ghost btn-sm size-[30px] shrink-0 p-0 text-base text-base-content/40";
