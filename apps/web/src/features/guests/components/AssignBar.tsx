import { openSeatCount } from "@seating/shared";
import { useMemo } from "react";

import { tableDisplayName } from "../../editor/lib/tableLabel";
import { useDocumentStore } from "../../editor/store/documentStore";
import { useGuestStore } from "../store/guestStore";
import { useSeatingFlowStore } from "../store/seatingFlowStore";
import { SelectionMoreMenu } from "./SelectionMoreMenu";

/** Action bar for the ticked guests, docked to the bottom of the guest list
 * and only there while someone is ticked: seat the selection at a table (with
 * household checks and the overflow prompt), group them as a household, More
 * (rules, swap, leave a household), or clear the selection. */
export function AssignBar(): JSX.Element | null {
  const doc = useDocumentStore((state) => state.doc);
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const clearGuestSelection = useGuestStore((state) => state.clearGuestSelection);
  const groupAsHousehold = useGuestStore((state) => state.groupAsHousehold);
  const requestSeating = useSeatingFlowStore((state) => state.requestSeating);

  const tableOptions = useMemo(
    () =>
      (doc?.tables ?? []).map((table, index) => ({
        id: table.id,
        name: tableDisplayName(table.label, index),
        open: doc ? openSeatCount(doc, table.id, selectedGuestIds) : 0,
      })),
    [doc, selectedGuestIds],
  );

  const householdIds = useMemo(() => {
    const selected = new Set(selectedGuestIds);
    return new Set(
      (doc?.guests ?? [])
        .filter((guest) => selected.has(guest.id))
        .map((guest) => guest.householdId),
    );
  }, [doc, selectedGuestIds]);

  const count = selectedGuestIds.length;
  if (count === 0) return null;
  // Grouping only makes sense if they aren't already exactly one household.
  const canGroup = count > 1 && (householdIds.size > 1 || householdIds.has(null));

  return (
    <div
      role="region"
      aria-label="Selected guests"
      className="sticky bottom-0 z-20 flex flex-wrap items-center gap-1.5 rounded-box border border-primary/40 bg-base-100 p-2 shadow-lg"
    >
      <span className="text-xs font-semibold text-primary">{count} selected</span>
      <select
        className="select select-bordered select-sm min-w-32 flex-1"
        aria-label="Assign selected guests to a table"
        disabled={tableOptions.length === 0}
        value=""
        onChange={(event) => {
          const tableId = event.target.value;
          if (tableId) requestSeating(selectedGuestIds, { kind: "table", tableId });
          event.target.value = "";
        }}
      >
        <option value="" disabled>
          Assign to table…
        </option>
        {tableOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} ({option.open === 0 ? "full" : `${option.open} open`})
          </option>
        ))}
      </select>
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!canGroup}
          className="btn btn-outline btn-xs"
          title="Group as household: seat these guests together from now on (select two or more)"
          onClick={() => groupAsHousehold(selectedGuestIds)}
        >
          Group
        </button>
        <SelectionMoreMenu />
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          title="Clear the selection"
          onClick={clearGuestSelection}
        >
          Clear
        </button>
      </span>
    </div>
  );
}
