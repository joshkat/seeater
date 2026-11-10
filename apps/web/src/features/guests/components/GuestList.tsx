import { type PointerEvent, useEffect, useMemo, useRef } from "react";

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
import { effectiveTab, guestTabCounts, isDeclinedUnseated } from "../lib/guestTabs";
import { showUndoNotice } from "../../editor/store/historyActions";
import { useGuestFilterStore } from "../store/guestFilterStore";
import { useGuestHighlightStore } from "../store/guestHighlightStore";
import { useGuestDetailsStore } from "../store/guestDetailsStore";
import { useGuestStore } from "../store/guestStore";
import { useEditorStore } from "../../editor/store/editorStore";
import { AssignBar } from "./AssignBar";
import { GuestColumnHeaders } from "./GuestColumnHeaders";
import { GuestListItem } from "./GuestListItem";
import { GuestSectionHeading } from "./GuestSectionHeading";
import { GuestTabs } from "./GuestTabs";
import { type SeatedTableGroup, SeatedTables } from "./SeatedTables";
import { UnseatedEntries } from "./UnseatedEntries";
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

/**
 * The guest list. Tabs choose who is listed: "To seat" (the default: guests
 * still without a seat, so seating someone takes them off the list), "Seated"
 * (grouped by table) or "All". A search lists every match, whatever the tab.
 */
export function GuestList({ seatInfoFor }: GuestListProps): JSX.Element {
  const guests = useGuests();
  const households = useHouseholds();
  const ruleGuestIds = useRuleProblems().guestIds;
  const filter = useGuestFilterStore((state) => state.filter);
  const tab = useGuestFilterStore((state) => state.tab);
  const setTab = useGuestFilterStore((state) => state.setTab);
  const clearFilter = useGuestFilterStore((state) => state.clearFilter);
  const selectTable = useEditorStore((state) => state.selectTable);
  // Everything below lists only the guests matching the search and filters.
  const visibleGuests = useMemo(
    () => filterGuests(guests, households, filter),
    [guests, households, filter],
  );
  const filtering = isFiltering(filter);
  const searching = filter.query.trim() !== "";
  const view = effectiveTab(tab, filter.query);
  const counts = useMemo(() => guestTabCounts(visibleGuests), [visibleGuests]);
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const selectGuest = useGuestStore((state) => state.selectGuest);
  const selectRange = useGuestStore((state) => state.selectRange);
  const setGuestSelection = useGuestStore((state) => state.setGuestSelection);
  const assignSeat = useGuestStore((state) => state.assignSeat);
  const openDetails = useGuestDetailsStore((state) => state.open);
  const editGuest = useGuestStore((state) => state.editGuest);
  const renameHousehold = useGuestStore((state) => state.renameHousehold);
  const dissolveHousehold = useGuestStore((state) => state.dissolveHousehold);
  const flashIds = useGuestHighlightStore((state) => state.guestIds);
  const flashToken = useGuestHighlightStore((state) => state.token);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Everyone without a seat, in name order. Declined guests stay in place
  // (struck through) so a row never jumps when its RSVP changes; they just
  // aren't counted on the "To seat" tab or picked by "Select next".
  const unseatedEntries = useMemo(
    () => buildUnassignedEntries(visibleGuests, households),
    [visibleGuests, households],
  );
  const unseatedIds = useMemo(() => unassignedOrder(unseatedEntries), [unseatedEntries]);
  const declinedUnseated = useMemo(
    () => visibleGuests.filter(isDeclinedUnseated).length,
    [visibleGuests],
  );

  // Seated guests by table, ordered by table number then seat.
  const tableGroups = useMemo(() => {
    const groups = new Map<string, SeatedTableGroup>();
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
  const seatedIds = useMemo(
    () => tableGroups.flatMap((group) => group.items.map((item) => item.guestId)),
    [tableGroups],
  );

  // The rows on screen, in order: what select-all and a Shift-click range cover.
  const visibleOrder = useMemo(() => {
    if (view === "seated") return seatedIds;
    if (view === "all") return [...unseatedIds, ...seatedIds];
    return unseatedIds;
  }, [view, seatedIds, unseatedIds]);

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const selected = useMemo(() => new Set(selectedGuestIds), [selectedGuestIds]);
  const flashing = useMemo(() => new Set(flashIds), [flashIds]);

  // A guest was just added: bring their row into view (it's highlighted too).
  useEffect(() => {
    const first = useGuestHighlightStore.getState().guestIds[0];
    if (!first) return;
    scrollRef.current
      ?.querySelector(`[data-guest-id="${first}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [flashToken]);

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

  const allSelected = visibleOrder.length > 0 && visibleOrder.every((id) => selected.has(id));

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

  // Taking someone out of their seat says so (they jump to "To seat").
  const unseat = (guestId: string): void => {
    const guest = guestById.get(guestId);
    const table = guest?.seatId ? seatInfoFor(guest.seatId)?.tableName : null;
    assignSeat(guestId, null);
    if (guest) showUndoNotice(`Removed ${guest.name} from ${table ?? "their seat"}.`);
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
        highlighted={flashing.has(guest.id)}
        nested={nested}
        onSelect={(modifiers) => handleSelect(guest.id, modifiers)}
        onPointerDown={(event) => startGuestDrag(event, guest.id)}
        onSetRsvp={(status) => editGuest(guest.id, { rsvpStatus: status })}
        onUnseat={() => unseat(guest.id)}
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

  const unseated = (entries: typeof unseatedEntries): JSX.Element => (
    <UnseatedEntries
      entries={entries}
      selected={selected}
      renderGuest={(guestId, nested) => renderItem(guestId, null, nested)}
      onSelectHousehold={handleSelectHousehold}
      onHouseholdPointerDown={startHouseholdDrag}
      onRenameHousehold={renameHousehold}
      onDissolveHousehold={dissolveHousehold}
    />
  );
  const seatedTables = (
    <SeatedTables
      groups={tableGroups}
      renderGuest={(guestId, seatNumber) => renderItem(guestId, seatNumber)}
      onShowTable={selectTable}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 max-sm:flex-none">
      {/* A search lists every match, so the tabs step aside for its count. */}
      {!searching && <GuestTabs tab={tab} counts={counts} onChange={setTab} />}
      {filtering && (
        <p className="flex items-center justify-between px-1 text-xs text-base-content/70">
          {searching
            ? `${visibleGuests.length} of ${guests.length} guests match`
            : `Filters on: ${visibleGuests.length} of ${guests.length} guests`}
          <button type="button" className="btn btn-xs" onClick={clearFilter}>
            Clear {searching ? "search" : "filters"}
          </button>
        </p>
      )}
      <div
        ref={scrollRef}
        role={searching ? undefined : "tabpanel"}
        aria-label={searching ? undefined : "Guest list"}
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto short:gap-1.5 max-sm:flex-none max-sm:overflow-visible"
      >
        <GuestColumnHeaders
          allSelected={allSelected}
          someSelected={selectedGuestIds.length > 0}
          onToggleAll={() => setGuestSelection(allSelected ? [] : visibleOrder)}
        />

        {view === "toSeat" && (
          <>
            {counts.toSeat > 0 && (
              <div className="flex items-center justify-between gap-2 px-1">
                {/* Never wraps: a second line would push the list down. */}
                <span className="min-w-0 truncate text-xs text-base-content/70">
                  A table’s worth at a time:
                </span>
                <SelectNextControl
                  disabled={false}
                  onSelectNext={(count) =>
                    setGuestSelection(
                      nextUnassignedBatch(unseatedIds, guests, selectedGuestIds, count),
                    )
                  }
                />
              </div>
            )}
            {counts.toSeat === 0 &&
              (filtering ? (
                <EmptyHint>Nobody left to seat matches these filters.</EmptyHint>
              ) : (
                <div className="mx-1 rounded-box border border-success/40 bg-success/10 p-3 text-sm">
                  <p className="m-0 font-semibold text-base-content">
                    <span aria-hidden>🎉 </span>Everyone who’s coming has a seat
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm mt-2"
                    onClick={() => setTab("seated")}
                  >
                    See who’s seated
                  </button>
                </div>
              ))}
            {unseatedIds.length > 0 && (
              <section aria-label="To seat">{unseated(unseatedEntries)}</section>
            )}
            {declinedUnseated > 0 && (
              <EmptyHint>
                {declinedUnseated === 1
                  ? "1 guest here has declined and doesn’t need a seat."
                  : `${declinedUnseated} guests here have declined and don’t need a seat.`}
              </EmptyHint>
            )}
          </>
        )}

        {view === "seated" &&
          (seatedIds.length > 0 ? (
            <section aria-label="Seated">{seatedTables}</section>
          ) : filtering ? (
            <EmptyHint>Nobody seated matches these filters.</EmptyHint>
          ) : (
            <EmptyHint>
              Nobody is seated yet. Drag a guest onto a table, or tick guests and choose “Assign to
              table…”.
            </EmptyHint>
          ))}

        {view === "all" && (
          <>
            {unseatedIds.length > 0 && (
              <section>
                <GuestSectionHeading>{`Not seated (${unseatedIds.length})`}</GuestSectionHeading>
                {unseated(unseatedEntries)}
              </section>
            )}
            {seatedIds.length > 0 && (
              <section>
                <GuestSectionHeading>{`Seated (${seatedIds.length})`}</GuestSectionHeading>
                {seatedTables}
              </section>
            )}
            {visibleGuests.length === 0 && (
              <EmptyHint>No guests match. Try another search or clear the filters.</EmptyHint>
            )}
          </>
        )}
        {/* Last in the scroll area and sticky: it floats over the rows while
            there's more to scroll, and at the end it takes its own space, so
            ticking a guest never moves the list. */}
        <AssignBar />
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }): JSX.Element {
  return <p className="m-0 px-2 py-1 text-xs text-base-content/70">{children}</p>;
}
