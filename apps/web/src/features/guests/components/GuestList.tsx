import { type PointerEvent, useMemo } from "react";

import { beginPointerDrag } from "../../dnd/lib/pointerDrag";
import { useLayoutStore } from "../../editor/store/layoutStore";

import { useGuests, useHouseholds } from "../../editor/hooks/useDocumentSelectors";
import {
  buildUnassignedEntries,
  nextUnassignedBatch,
  unassignedOrder,
} from "../lib/guestListModel";
import type { SelectModifiers } from "../lib/selectModifiers";
import { filterGuests, isFiltering } from "../lib/guestFilter";
import { useRuleProblems } from "../../rules/hooks/useRuleProblems";
import { guestSubtitle } from "../lib/guestSubtitle";
import { locateGuestSeat } from "../lib/locateGuest";
import { useGuestFilterStore } from "../store/guestFilterStore";
import { useGuestDetailsStore } from "../store/guestDetailsStore";
import { useGuestStore } from "../store/guestStore";
import { useEditorStore } from "../../editor/store/editorStore";
import { GuestFilterBar } from "./filter/GuestFilterBar";
import { GuestColumnHeaders } from "./GuestColumnHeaders";
import { GuestListItem } from "./GuestListItem";
import { HouseholdHeader } from "./HouseholdHeader";
import { SelectNextControl } from "./SelectNextControl";

/** Touch: press and hold this long before dragging, so the list still scrolls. */
const TOUCH_HOLD_MS = 350;

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
  const ruleGuestIds = useRuleProblems().guestIds;
  const filter = useGuestFilterStore((state) => state.filter);
  const clearFilter = useGuestFilterStore((state) => state.clearFilter);
  const selectTable = useEditorStore((state) => state.selectTable);
  // Everything below lists only the guests matching the search and filters.
  const visibleGuests = useMemo(
    () => filterGuests(guests, households, filter),
    [guests, households, filter],
  );
  const filtering = isFiltering(filter);
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const selectGuest = useGuestStore((state) => state.selectGuest);
  const selectRange = useGuestStore((state) => state.selectRange);
  const setGuestSelection = useGuestStore((state) => state.setGuestSelection);
  const assignSeat = useGuestStore((state) => state.assignSeat);
  const openDetails = useGuestDetailsStore((state) => state.open);
  const editGuest = useGuestStore((state) => state.editGuest);
  const renameHousehold = useGuestStore((state) => state.renameHousehold);
  const dissolveHousehold = useGuestStore((state) => state.dissolveHousehold);

  const unassignedEntries = useMemo(
    () => buildUnassignedEntries(visibleGuests, households),
    [visibleGuests, households],
  );
  const unassignedIds = useMemo(() => unassignedOrder(unassignedEntries), [unassignedEntries]);

  // Group seated guests by their table, ordered by table number then seat.
  const tableGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        name: string;
        index: number;
        tableId: string;
        items: { guestId: string; seatNumber: number }[];
      }
    >();
    for (const guest of visibleGuests) {
      if (!guest.seatId) continue;
      const info = seatInfoFor(guest.seatId);
      if (!info) continue;
      const group = groups.get(info.tableId) ?? {
        tableId: info.tableId,
        name: info.tableName,
        index: info.tableIndex,
        items: [],
      };
      group.items.push({ guestId: guest.id, seatNumber: info.seatNumber });
      groups.set(info.tableId, group);
    }
    return [...groups.values()]
      .sort((a, b) => a.index - b.index)
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => a.seatNumber - b.seatNumber),
      }));
  }, [visibleGuests, seatInfoFor]);

  // Everything in display order: what a Shift-click range runs over.
  const visibleOrder = useMemo(
    () => [...unassignedIds, ...tableGroups.flatMap((group) => group.items.map((i) => i.guestId))],
    [unassignedIds, tableGroups],
  );

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const selected = useMemo(() => new Set(selectedGuestIds), [selectedGuestIds]);
  const seatedCount = visibleGuests.length - unassignedIds.length;

  // Enter in the search box: show the first matching seated guest on the map.
  const locateFirstMatch = (): void => {
    const first = visibleGuests.find((guest) => guest.seatId);
    if (first?.seatId) locateGuestSeat(first.seatId);
  };

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

  // Dragging a selected guest carries the whole selection.
  const startGuestDrag = (event: PointerEvent, guestId: string): void => {
    beginPointerDrag(
      event,
      () => {
        const { selectedGuestIds: current } = useGuestStore.getState();
        const guestIds = current.includes(guestId) && current.length > 1 ? current : [guestId];
        return { kind: "guests", guestIds, label: guestById.get(guestId)?.name ?? "Guest" };
      },
      // On a tablet the guest drawer covers the canvas: get it out of the way.
      {
        touchDelayMs: TOUCH_HOLD_MS,
        onStart: () => useLayoutStore.getState().setGuestsOpen(false),
      },
    );
  };

  const startHouseholdDrag = (event: PointerEvent, memberIds: string[], name: string): void => {
    beginPointerDrag(event, () => ({ kind: "guests", guestIds: memberIds, label: name }), {
      touchDelayMs: TOUCH_HOLD_MS,
      onStart: () => {
        setGuestSelection(memberIds);
        useLayoutStore.getState().setGuestsOpen(false);
      },
    });
  };

  const renderItem = (
    guestId: string,
    seatNumber: number | null,
    nested = false,
  ): JSX.Element | null => {
    const guest = guestById.get(guestId);
    if (!guest) return null;
    return (
      <GuestListItem
        key={guest.id}
        guest={guest}
        subtitle={guestSubtitle(guest, seatNumber, ruleGuestIds.has(guest.id))}
        selected={selected.has(guest.id)}
        nested={nested}
        onSelect={(modifiers) => handleSelect(guest.id, modifiers)}
        onPointerDown={(event) => startGuestDrag(event, guest.id)}
        onSetRsvp={(status) => editGuest(guest.id, { rsvpStatus: status })}
        onUnseat={() => assignSeat(guest.id, null)}
        onEdit={() => openDetails(guest.id)}
      />
    );
  };

  if (guests.length === 0) {
    return (
      <p className="mx-1 my-2 text-sm text-base-content/70">
        No guests yet. Add one above or import a spreadsheet.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 max-sm:flex-none">
      <GuestFilterBar onLocateFirst={locateFirstMatch} />
      {filtering && (
        <p className="flex items-center justify-between px-1 text-xs text-base-content/60">
          Showing {visibleGuests.length} of {guests.length}
          <button type="button" className="btn btn-ghost btn-xs" onClick={clearFilter}>
            Clear filters
          </button>
        </p>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto max-sm:flex-none max-sm:overflow-visible">
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
                setGuestSelection(
                  nextUnassignedBatch(unassignedIds, guests, selectedGuestIds, count),
                )
              }
            />
          </div>
          <ul className={listClass}>
            {unassignedEntries.map((entry) =>
              entry.kind === "guest" ? (
                renderItem(entry.guest.id, null)
              ) : (
                <li key={entry.household.id}>
                  <HouseholdHeader
                    household={entry.household}
                    shownCount={entry.members.length}
                    allMemberIds={entry.allMemberIds}
                    selected={entry.allMemberIds.every((id) => selected.has(id))}
                    partlySelected={entry.allMemberIds.some((id) => selected.has(id))}
                    onSelect={(modifiers) => handleSelectHousehold(entry.allMemberIds, modifiers)}
                    onPointerDown={(event) =>
                      startHouseholdDrag(event, entry.allMemberIds, entry.household.name)
                    }
                    onRename={(name) => renameHousehold(entry.household.id, name)}
                    onDissolve={() => dissolveHousehold(entry.household.id)}
                  />
                  <ul className={listClass}>
                    {entry.members.map((member) => renderItem(member.id, null, true))}
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
              <div key={group.tableId}>
                <h4 className="mb-0.5 text-xs font-semibold text-secondary">
                  {/* The whole heading is the button (44px tall on touch), with
                      a visible hint of what it does. */}
                  <button
                    type="button"
                    className="group flex w-full cursor-pointer items-center gap-1 rounded-field px-1.5 py-0.5 text-left hover:bg-base-200 pointer-coarse:min-h-11"
                    title="Show this table on the map"
                    onClick={() => selectTable(group.tableId)}
                  >
                    <span className="group-hover:underline">{group.name}</span>
                    <span className="font-normal text-base-content/70">
                      {" "}
                      • {group.items.length}
                    </span>
                    <span className="ml-auto font-normal text-base-content/70">
                      <span aria-hidden>⌖ </span>Show on map
                    </span>
                  </button>
                </h4>
                <ul className={listClass}>
                  {group.items.map((item) => renderItem(item.guestId, item.seatNumber))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        {filtering && visibleGuests.length === 0 && (
          <EmptyHint>No guests match. Try another search or clear the filters.</EmptyHint>
        )}
      </div>
    </div>
  );
}

const headingClass = "ml-1 text-[11px] uppercase tracking-wide text-base-content/60";
const listClass = "m-0 flex list-none flex-col gap-0.5 p-0";

function EmptyHint({ children }: { children: React.ReactNode }): JSX.Element {
  return <p className="m-0 px-2 py-1 text-xs text-base-content/70">{children}</p>;
}
