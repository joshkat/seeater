import { openSeatCount } from "@seating/shared";
import { useMemo } from "react";

import { tableDisplayName } from "../../editor/lib/tableLabel";
import { useDocumentStore } from "../../editor/store/documentStore";
import { useGuestStore } from "../store/guestStore";
import { useSeatingFlowStore } from "../store/seatingFlowStore";

/** Action bar shown when one or more guests are selected: seat the whole
 * selection at a table (with household checks and the overflow prompt), group
 * or ungroup them as a household, or clear the selection. */
export function AssignBar(): JSX.Element | null {
  const doc = useDocumentStore((state) => state.doc);
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const clearGuestSelection = useGuestStore((state) => state.clearGuestSelection);
  const groupAsHousehold = useGuestStore((state) => state.groupAsHousehold);
  const removeFromHousehold = useGuestStore((state) => state.removeFromHousehold);
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

  if (selectedGuestIds.length === 0) return null;

  const count = selectedGuestIds.length;
  // Grouping only makes sense if they aren't already exactly one household.
  const canGroup = count > 1 && (householdIds.size > 1 || householdIds.has(null));
  const canUngroup = [...householdIds].some((id) => id !== null);

  return (
    <div className="flex flex-col gap-1.5 rounded-box border border-primary/30 bg-primary/5 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">
          {count} guest{count === 1 ? "" : "s"} selected
        </span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={clearGuestSelection}>
          Clear
        </button>
      </div>
      <select
        className="select select-bordered select-sm w-full"
        aria-label="Assign selected guests to a table"
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
      {(canGroup || canUngroup) && (
        <div className="flex flex-wrap gap-1.5">
          {canGroup && (
            <button
              type="button"
              className="btn btn-outline btn-xs"
              title="Seat these guests together from now on"
              onClick={() => groupAsHousehold(selectedGuestIds)}
            >
              Group as household
            </button>
          )}
          {canUngroup && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => removeFromHousehold(selectedGuestIds)}
            >
              Remove from household
            </button>
          )}
        </div>
      )}
    </div>
  );
}
