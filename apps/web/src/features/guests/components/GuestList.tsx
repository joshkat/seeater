import { useMemo } from "react";

import { useGuests, useHouseholds } from "../../editor/hooks/useDocumentSelectors";
import {
  buildUnassignedEntries,
  nextUnassignedBatch,
  unassignedOrder,
} from "../lib/guestListModel";
import type { SelectModifiers } from "../lib/selectModifiers";
import { useGuestStore } from "../store/guestStore";
import { GuestColumnHeaders } from "./GuestColumnHeaders";
import { GuestListItem } from "./GuestListItem";
import { HouseholdHeader } from "./HouseholdHeader";
import { SelectNextControl } from "./SelectNextControl";

/** Where a seat lives, for grouping the seated list by table. */
export interface SeatInfo {
  tableId: string;
  tableName: string;
  tableIndex: number;
  seatNumber: number;
}

interface GuestListProps {
  /** Resolves a seat id to its table + seat location, if known. */
  seatInfoFor: (seatId: string) => SeatInfo | null;
}

/** The guest list: unassigned guests (households grouped), then seated guests
 * grouped by table. */
export function GuestList({ seatInfoFor }: GuestListProps): JSX.Element {
  const guests = useGuests();
  const households = useHouseholds();
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const selectGuest = useGuestStore((state) => state.selectGuest);
  const selectRange = useGuestStore((state) => state.selectRange);
  const setGuestSelection = useGuestStore((state) => state.setGuestSelection);
  const assignSeat = useGuestStore((state) => state.assignSeat);
  const removeGuest = useGuestStore((state) => state.removeGuest);
  const editGuest = useGuestStore((state) => state.editGuest);
  const renameHousehold = useGuestStore((state) => state.renameHousehold);
  const dissolveHousehold = useGuestStore((state) => state.dissolveHousehold);

  const unassignedEntries = useMemo(
    () => buildUnassignedEntries(guests, households),
    [guests, households],
  );
  const unassignedIds = useMemo(() => unassignedOrder(unassignedEntries), [unassignedEntries]);

  // Group seated guests by their table, ordered by table number then seat.
  const tableGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        name: string;
        index: number;
        items: { guestId: string; seatNumber: number; guestContact: string | null }[];
      }
    >();
    for (const guest of guests) {
      if (!guest.seatId) continue;
      const info = seatInfoFor(guest.seatId);
      if (!info) continue;
      const group = groups.get(info.tableId) ?? {
        name: info.tableName,
        index: info.tableIndex,
        items: [],
      };
      group.items.push({
        guestId: guest.id,
        seatNumber: info.seatNumber,
        guestContact: guest.email ?? guest.phone ?? null,
      });
      groups.set(info.tableId, group);
    }
    return [...groups.values()]
      .sort((a, b) => a.index - b.index)
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => a.seatNumber - b.seatNumber),
      }));
  }, [guests, seatInfoFor]);

  // Everything in display order: what a Shift-click range runs over.
  const visibleOrder = useMemo(
    () => [...unassignedIds, ...tableGroups.flatMap((group) => group.items.map((i) => i.guestId))],
    [unassignedIds, tableGroups],
  );

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const selected = useMemo(() => new Set(selectedGuestIds), [selectedGuestIds]);
  const seatedCount = guests.length - unassignedIds.length;

  const handleSelect = (guestId: string, { additive, range }: SelectModifiers): void => {
    if (range) selectRange(guestId, visibleOrder, additive);
    else selectGuest(guestId, additive);
  };

  const handleSelectHousehold = (memberIds: string[], { additive }: SelectModifiers): void => {
    if (!additive) {
      setGuestSelection(memberIds);
      return;
    }
    // ⌘/Ctrl-click toggles the whole household in or out of the selection.
    const allSelected = memberIds.every((id) => selected.has(id));
    setGuestSelection(
      allSelected
        ? selectedGuestIds.filter((id) => !memberIds.includes(id))
        : [...new Set([...selectedGuestIds, ...memberIds])],
    );
  };

  const allSelected = guests.length > 0 && guests.every((guest) => selected.has(guest.id));

  const renderItem = (
    guestId: string,
    subtitle: string | null,
    nested = false,
  ): JSX.Element | null => {
    const guest = guestById.get(guestId);
    if (!guest) return null;
    return (
      <GuestListItem
        key={guest.id}
        guest={guest}
        subtitle={subtitle}
        selected={selected.has(guest.id)}
        nested={nested}
        onSelect={(modifiers) => handleSelect(guest.id, modifiers)}
        onSetRsvp={(status) => editGuest(guest.id, { rsvpStatus: status })}
        onUnseat={() => assignSeat(guest.id, null)}
        onRemove={() => removeGuest(guest.id)}
      />
    );
  };

  if (guests.length === 0) {
    return (
      <p className="mx-1 my-2 text-sm text-base-content/40">
        No guests yet. Add one above or import a spreadsheet.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
      <GuestColumnHeaders
        allSelected={allSelected}
        someSelected={selectedGuestIds.length > 0}
        onToggleAll={() => setGuestSelection(allSelected ? [] : visibleOrder)}
      />
      <section>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className={headingClass}>{`Unassigned (${unassignedIds.length})`}</h3>
          <SelectNextControl
            disabled={unassignedIds.length === 0}
            onSelectNext={(count) =>
              setGuestSelection(nextUnassignedBatch(unassignedIds, guests, selectedGuestIds, count))
            }
          />
        </div>
        <ul className={listClass}>
          {unassignedEntries.map((entry) =>
            entry.kind === "guest" ? (
              renderItem(entry.guest.id, entry.guest.email ?? entry.guest.phone ?? null)
            ) : (
              <li key={entry.household.id}>
                <HouseholdHeader
                  household={entry.household}
                  shownCount={entry.members.length}
                  allMemberIds={entry.allMemberIds}
                  selected={entry.allMemberIds.every((id) => selected.has(id))}
                  partlySelected={entry.allMemberIds.some((id) => selected.has(id))}
                  onSelect={(modifiers) => handleSelectHousehold(entry.allMemberIds, modifiers)}
                  onRename={(name) => renameHousehold(entry.household.id, name)}
                  onDissolve={() => dissolveHousehold(entry.household.id)}
                />
                <ul className={listClass}>
                  {entry.members.map((member) =>
                    renderItem(member.id, member.email ?? member.phone ?? null, true),
                  )}
                </ul>
              </li>
            ),
          )}
          {unassignedIds.length === 0 && <EmptyHint>Everyone has a seat 🎉</EmptyHint>}
        </ul>
      </section>

      <section>
        <h3 className={`${headingClass} mb-1`}>{`Seated (${seatedCount})`}</h3>
        {seatedCount === 0 && <EmptyHint>Drag a guest onto a seat to begin.</EmptyHint>}
        <div className="flex flex-col gap-2.5">
          {tableGroups.map((group) => (
            <div key={group.name}>
              <h4 className="mb-0.5 ml-1.5 text-xs font-semibold text-secondary">
                {group.name}
                <span className="font-normal text-base-content/40"> • {group.items.length}</span>
              </h4>
              <ul className={listClass}>
                {group.items.map((item) =>
                  renderItem(
                    item.guestId,
                    `Seat ${item.seatNumber} ${item.guestContact != null ? "• " : ""}${item.guestContact ?? ""}`,
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const headingClass = "ml-1 text-[11px] uppercase tracking-wide text-base-content/60";
const listClass = "m-0 flex list-none flex-col gap-0.5 p-0";

function EmptyHint({ children }: { children: React.ReactNode }): JSX.Element {
  return <p className="m-0 px-2 py-1 text-xs text-base-content/40">{children}</p>;
}
