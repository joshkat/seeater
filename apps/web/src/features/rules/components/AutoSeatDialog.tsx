import { autoSeat } from "@seating/shared";
import { useEffect, useRef, useState } from "react";

import { useModalFocus } from "../../../lib/useModalFocus";
import { useDocumentStore } from "../../editor/store/documentStore";
import { useGuestStore } from "../../guests/store/guestStore";
import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";

/** Auto-seat: fill open seats with guests who don't have one, following households and rules. */
export function AutoSeatDialog({ onClose }: { onClose: () => void }): JSX.Element | null {
  const boxRef = useRef<HTMLDivElement>(null);
  useModalFocus(boxRef);
  const doc = useDocumentStore((state) => state.doc);
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const [onlySelected, setOnlySelected] = useState(selectedGuestIds.length > 0);
  const [groupByTag, setGroupByTag] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!doc) return null;
  const scope = onlySelected ? new Set(selectedGuestIds) : null;
  const waiting = doc.guests.filter(
    (guest) => !guest.seatId && guest.rsvpStatus !== "declined" && (!scope || scope.has(guest.id)),
  ).length;
  const openSeats =
    doc.tables.reduce((sum, table) => sum + table.seats.length, 0) -
    doc.guests.filter((guest) => guest.seatId).length;

  function run(): void {
    let summary = "";
    useDocumentStore.getState().apply((current) => {
      const result = autoSeat(current, {
        guestIds: onlySelected ? selectedGuestIds : undefined,
        groupByTag,
      });
      const names = new Map(current.guests.map((guest) => [guest.id, guest.name]));
      summary =
        `Auto-seated ${result.seatedIds.length} guest${result.seatedIds.length === 1 ? "" : "s"}.` +
        (result.unplacedIds.length > 0
          ? ` No room for: ${result.unplacedIds.map((id) => names.get(id)).join(", ")}.`
          : "");
      return result.doc;
    });
    useGuestStore.getState().clearGuestSelection();
    useSeatingFlowStore.getState().showNotice(summary);
    onClose();
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Auto-seat">
      <div ref={boxRef} className="modal-box flex max-w-md flex-col gap-3 text-base-content">
        <h2 className="text-lg font-semibold">Auto-seat</h2>
        <p className="text-sm text-base-content/70">
          Fills open seats with guests who don’t have one. Households and “keep together” rules stay
          at one table; “keep apart” guests never share one. Declined guests are skipped. You can
          undo it.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            className="radio radio-sm"
            checked={!onlySelected}
            onChange={() => setOnlySelected(false)}
          />
          Everyone without a seat
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            className="radio radio-sm"
            disabled={selectedGuestIds.length === 0}
            checked={onlySelected}
            onChange={() => setOnlySelected(true)}
          />
          Only the {selectedGuestIds.length} selected guest
          {selectedGuestIds.length === 1 ? "" : "s"}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={groupByTag}
            onChange={(event) => setGroupByTag(event.target.checked)}
          />
          Seat guests with the same tag together (e.g. “Work”, “Family”)
        </label>
        <p className="text-xs text-base-content/60">
          {waiting} guest{waiting === 1 ? "" : "s"} to seat · {Math.max(0, openSeats)} open seats
        </p>
        <div className="modal-action mt-1">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={waiting === 0}
            onClick={run}
          >
            Auto-seat
          </button>
        </div>
      </div>
    </div>
  );
}
