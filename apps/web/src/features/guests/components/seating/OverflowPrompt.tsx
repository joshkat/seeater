import { MAX_SEAT_COUNT, openSeatCount, tableIdBySeat } from "@seating/shared";
import { useMemo } from "react";

import { tableDisplayName, tableNameById } from "../../../editor/lib/tableLabel";
import { useDocumentStore } from "../../../editor/store/documentStore";
import { useGuestStore } from "../../store/guestStore";
import { type Overflow, useSeatingFlowStore } from "../../store/seatingFlowStore";

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
 */
export function OverflowPrompt({ overflow }: { overflow: Overflow }): JSX.Element | null {
  const doc = useDocumentStore((state) => state.doc);
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const placeOverflowAt = useSeatingFlowStore((state) => state.placeOverflowAt);
  const splitOverflow = useSeatingFlowStore((state) => state.splitOverflow);
  const addChairsForOverflow = useSeatingFlowStore((state) => state.addChairsForOverflow);
  const leaveUnseated = useSeatingFlowStore((state) => state.leaveUnseated);
  const dismiss = useSeatingFlowStore((state) => state.dismiss);

  const model = useMemo(() => {
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
      .filter((option) => option.id !== tableId && option.open > 0 && !alreadyAt(option.id));
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
  }, [doc, overflow]);

  // The user picked other guests: this prompt no longer applies.
  if (!model || !sameIds(selectedGuestIds, overflow.guestIds)) return null;

  const count = overflow.guestIds.length;

  return (
    <div
      role="dialog"
      aria-label="Guests that didn't fit"
      className="card pointer-events-auto w-full max-w-lg border border-warning/50 bg-base-100 shadow-xl"
    >
      <div className="card-body gap-2.5 p-4 text-sm text-base-content">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">
            {count} guest{count === 1 ? "" : "s"} didn’t fit at {model.name} — pick another table
          </p>
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

        {model.openHere > 0 && model.blockedHouseholds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-box bg-base-200 px-3 py-2 text-xs">
            <span>
              {model.name} still has {model.openHere} open seat{model.openHere === 1 ? "" : "s"},
              not enough to keep {model.blockedHouseholds.join(", ")} together.
            </span>
            <button type="button" className="btn btn-warning btn-xs" onClick={splitOverflow}>
              Split household here
            </button>
          </div>
        )}

        {model.options.length > 0 ? (
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
            {model.options.map((option) => (
              <button
                key={option.id}
                type="button"
                title={option.open >= count ? "Everyone fits" : `Only ${option.open} fit`}
                className={`btn btn-sm ${option.open >= count ? "btn-success btn-soft" : "btn-outline"}`}
                onClick={() => placeOverflowAt(option.id)}
              >
                {option.name}
                <span className="badge badge-sm">{option.open} open</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-base-content/60">No other table has open seats.</p>
        )}

        <div className="card-actions justify-end">
          {model.canAddChairs && (
            <button type="button" className="btn btn-outline btn-sm" onClick={addChairsForOverflow}>
              + {model.chairsToAdd} chair{model.chairsToAdd === 1 ? "" : "s"} at {model.name}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={leaveUnseated}>
            {model.leaveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
