import { openSeatCount } from "@seating/shared";
import { useMemo } from "react";

import { tableDisplayName } from "../../editor/lib/tableLabel";
import { useDocumentStore } from "../../editor/store/documentStore";
import { useGuestStore } from "../store/guestStore";
import { useSeatingFlowStore } from "../store/seatingFlowStore";

/** Action bar for the selected guests: seat the whole selection at a table
 * (with household checks and the overflow prompt), group or ungroup them as a
 * household, or clear the selection. */
export function AssignBar(): JSX.Element {
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

  const count = selectedGuestIds.length;
  const none = count === 0;
  // Grouping only makes sense if they aren't already exactly one household.
  const canGroup = count > 1 && (householdIds.size > 1 || householdIds.has(null));
  const canUngroup = [...householdIds].some((id) => id !== null);

  // Always rendered at the same height (controls just disable), so selecting
  // a guest never shifts the list below.
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-box border p-2 ${
        none ? "border-base-300 bg-base-200/40" : "border-primary/30 bg-primary/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${none ? "text-base-content/50" : "text-primary"}`}>
          {none
            ? "Tick guests to seat or group them"
            : `${count} guest${count === 1 ? "" : "s"} selected`}
        </span>
        <button
          type="button"
          disabled={none}
          className="btn btn-ghost btn-xs"
          onClick={clearGuestSelection}
        >
          Clear
        </button>
      </div>
      <select
        className="select select-bordered select-sm w-full"
        aria-label="Assign selected guests to a table"
        disabled={none || tableOptions.length === 0}
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
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={!canGroup}
          className="btn btn-outline btn-xs"
          title="Seat these guests together from now on (select two or more)"
          onClick={() => groupAsHousehold(selectedGuestIds)}
        >
          Group as household
        </button>
        <button
          type="button"
          disabled={!canUngroup}
          className="btn btn-ghost btn-xs"
          title="Take the selected guests out of their household"
          onClick={() => removeFromHousehold(selectedGuestIds)}
        >
          Remove from household
        </button>
      </div>
    </div>
  );
}
