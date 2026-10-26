import { MAX_SEAT_COUNT, openSeatCount, tableIdBySeat } from "@seating/shared";
import { useEffect, useMemo, useRef, useState } from "react";

import { useExactSeatPlacement } from "../../../editor/hooks/useDocumentSelectors";
import { tableDisplayName, tableNameById } from "../../../editor/lib/tableLabel";
import { useDocumentStore } from "../../../editor/store/documentStore";
import { useTablePreviewStore } from "../../../editor/store/tablePreviewStore";
import { useGuestStore } from "../../store/guestStore";
import { type Overflow, useSeatingFlowStore } from "../../store/seatingFlowStore";
import { type OverflowModel, OverflowChoices } from "./OverflowChoices";

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * "2 guests didn't fit at Table 3 — pick another table." Lists tables with
 * room (and their open seats for these guests), plus splitting a household
 * into the seats left here, adding chairs here, or leaving them as they are
 * (unseated, or in the seats they already had).
 * The leftovers stay selected the whole time, so dragging them still works.
 * Hovering or focusing a table choice shows that table on the canvas, and
 * the prompt can shrink to one line so it stops covering the room.
 */
export function OverflowPrompt({ overflow }: { overflow: Overflow }): JSX.Element | null {
  const doc = useDocumentStore((state) => state.doc);
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const placeOverflowAt = useSeatingFlowStore((state) => state.placeOverflowAt);
  const splitOverflow = useSeatingFlowStore((state) => state.splitOverflow);
  const addChairsForOverflow = useSeatingFlowStore((state) => state.addChairsForOverflow);
  const leaveUnseated = useSeatingFlowStore((state) => state.leaveUnseated);
  const dismiss = useSeatingFlowStore((state) => state.dismiss);
  // In exact mode every table choice opens the placement dialog, where
  // households can be split chair by chair, so no separate split button.
  const exact = useExactSeatPlacement().active;

  const model = useMemo((): OverflowModel | null => {
    if (!doc) return null;
    const { guestIds, tableId } = overflow;
    const table = doc.tables.find((candidate) => candidate.id === tableId);
    const openHere = openSeatCount(doc, tableId, guestIds);
    // A table where every leftover already sits would be a no-op, so skip it.
    const seatTable = tableIdBySeat(doc);
    const leftovers = doc.guests.filter((guest) => guestIds.includes(guest.id));
    const alreadyAt = (id: string): boolean =>
      leftovers.every((guest) => guest.seatId !== null && seatTable.get(guest.seatId) === id);
    const options = doc.tables
      .map((candidate, index) => ({
        id: candidate.id,
        name: tableDisplayName(candidate.label, index),
        open: openSeatCount(doc, candidate.id, guestIds),
      }))
      // In exact mode the same table is a fair choice: they may simply not
      // have been given a chair yet.
      .filter(
        (option) => (exact || option.id !== tableId) && option.open > 0 && !alreadyAt(option.id),
      );
    const canAddChairs =
      table !== undefined &&
      table.chairLayoutMode === "auto" &&
      table.seats.length < MAX_SEAT_COUNT;
    const chairsToAdd = table
      ? Math.min(guestIds.length - openHere, MAX_SEAT_COUNT - table.seats.length)
      : 0;
    const blockedHouseholds = doc.households
      .filter((household) =>
        doc.guests.some((g) => g.householdId === household.id && guestIds.includes(g.id)),
      )
      .map((household) => household.name);
    // Leftovers keep whatever seat they had, so "unseated" isn't always true.
    const seatedCount = leftovers.filter((guest) => guest.seatId).length;
    const leaveLabel =
      seatedCount === 0
        ? "Leave unseated"
        : seatedCount === guestIds.length
          ? "Keep current seats"
          : "Leave as they are";
    return {
      name: tableNameById(doc.tables, tableId),
      openHere,
      options,
      canAddChairs: canAddChairs && chairsToAdd > 0,
      chairsToAdd,
      blockedHouseholds,
      leaveLabel,
    };
  }, [doc, overflow, exact]);

  // Collapsed, the prompt is one line, so it stops covering the tables it lists.
  const [collapsed, setCollapsed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  // Space the prompt covers above the canvas's bottom edge (it sits 16px up).
  const coveredHeight = (): number => (cardRef.current?.offsetHeight ?? 0) + 16;
  useEffect(() => () => useTablePreviewStore.getState().clear(), []);

  // The user picked other guests: this prompt no longer applies.
  if (!model || !sameIds(selectedGuestIds, overflow.guestIds)) return null;

  const count = overflow.guestIds.length;

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Guests that didn't fit"
      className="card pointer-events-auto w-full max-w-lg border border-warning/50 bg-base-100 shadow-xl"
    >
      <div
        className={`card-body text-sm text-base-content ${collapsed ? "gap-0 px-4 py-2" : "gap-2.5 p-4"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">
            {exact
              ? `${count} guest${count === 1 ? "" : "s"} still need${count === 1 ? "s" : ""} a seat — pick a table`
              : `${count} guest${count === 1 ? "" : "s"} didn’t fit at ${model.name} — pick another table`}
          </p>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Show table choices" : "Hide table choices"}
              title={collapsed ? "Show the table choices" : "Shrink this to see the room"}
              className="btn btn-ghost btn-xs btn-square"
              onClick={() => setCollapsed(!collapsed)}
            >
              <span aria-hidden>{collapsed ? "▴" : "▾"}</span>
            </button>
            <button
              type="button"
              aria-label="Close"
              title="Close (guests stay selected)"
              className="btn btn-ghost btn-xs btn-square"
              onClick={dismiss}
            >
              ✕
            </button>
          </div>
        </div>

        {!collapsed && (
          <OverflowChoices
            exact={exact}
            model={model}
            count={count}
            coveredHeight={coveredHeight}
            onSplit={splitOverflow}
            onPlace={placeOverflowAt}
            onAddChairs={addChairsForOverflow}
            onLeave={leaveUnseated}
          />
        )}
      </div>
    </div>
  );
}
