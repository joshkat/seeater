import type { Guest, RsvpStatus } from "@seating/shared";
import type { PointerEvent } from "react";

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
  /** Starts a possible drag (mouse: on movement; touch: long-press). */
  onPointerDown: (event: PointerEvent<HTMLLIElement>) => void;
  onSetRsvp: (status: RsvpStatus) => void;
  onUnseat: () => void;
  /** Opens the guest details dialog. */
  onEdit: () => void;
}

/** A single guest row: a selection checkbox, draggable onto a seat, clickable
 * for click-to-assign, with a segmented RSVP control and seat/remove buttons. */
export function GuestListItem({
  guest,
  subtitle,
  selected,
  nested = false,
  onSelect,
  onPointerDown,
  onSetRsvp,
  onUnseat,
  onEdit,
}: GuestListItemProps): JSX.Element {
  const declined = guest.rsvpStatus === "declined";

  return (
    <li
      onPointerDown={onPointerDown}
      onClick={(event) => onSelect(selectModifiers(event))}
      title="Tick the box to pick several (or ⌘/Ctrl-click), Shift-click for a range, then drag onto a table (press and hold on touch) or pick a seat"
      className={`flex cursor-grab touch-manipulation select-none flex-wrap items-center [-webkit-touch-callout:none] gap-2 rounded-field border py-1.5 pr-2 ${
        nested ? "pl-6" : "pl-2"
      } ${selected ? "border-primary bg-primary/5" : "border-transparent"}`}
    >
      <SelectCheckbox
        checked={selected}
        label={`Select ${guest.name}`}
        onToggle={(range) => onSelect({ additive: true, range })}
        className="-my-1.5"
      />

      {/* Phones: the name takes the first line; RSVP and actions wrap below. */}
      <span className="min-w-0 flex-1 max-sm:basis-[calc(100%-3.5rem)]">
        <span
          className={`block truncate text-[13px] ${
            declined ? "text-base-content/70 line-through" : "text-base-content"
          }`}
        >
          {guest.name}
        </span>
        {subtitle && (
          <span className="block truncate text-[11px] text-base-content/60">{subtitle}</span>
        )}
      </span>

      <div
        className={`${GUEST_COLUMNS.rsvp} flex shrink-0 justify-center max-sm:ml-[3.25rem] max-sm:justify-start`}
      >
        <RsvpControl status={guest.rsvpStatus} onChange={onSetRsvp} guestName={guest.name} />
      </div>

      <div className={`${GUEST_COLUMNS.actions} flex shrink-0 justify-end max-sm:ml-auto`}>
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
            onEdit();
          }}
          title="Details: meal, dietary needs, tags, notes…"
          aria-label={`Details for ${guest.name}`}
          className={iconButtonClass}
        >
          ✎
        </button>
      </div>
    </li>
  );
}

const iconButtonClass =
  "btn btn-ghost btn-sm size-[30px] shrink-0 p-0 text-base text-base-content/60";
