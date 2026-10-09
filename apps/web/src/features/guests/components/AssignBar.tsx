import { useState } from "react";

import { useTables } from "../../editor/hooks/useDocumentSelectors";
import { tableDisplayName } from "../../editor/lib/tableLabel";
import { useGuestStore } from "../store/guestStore";

/** Action bar shown when one or more guests are selected: assign the whole
 * selection to a table's open seats, or clear the selection. */
export function AssignBar(): JSX.Element | null {
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const assignGuestsToTable = useGuestStore((state) => state.assignGuestsToTable);
  const clearGuestSelection = useGuestStore((state) => state.clearGuestSelection);
  const tables = useTables();

  const [message, setMessage] = useState<string | null>(null);

  if (selectedGuestIds.length === 0) return null;

  const count = selectedGuestIds.length;

  function handleAssign(tableId: string): void {
    const index = tables.findIndex((t) => t.id === tableId);
    if (index === -1) return;
    const name = tableDisplayName(tables[index].label, index);
    const { assigned, capacity } = assignGuestsToTable(selectedGuestIds, tableId);
    if (assigned === 0) {
      setMessage(`${name} is full — no open seats.`);
    } else if (assigned < count) {
      setMessage(`Seated ${assigned} of ${count} at ${name} (only ${capacity} open).`);
    } else {
      setMessage(`Seated ${assigned} at ${name}.`);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-box border border-primary/30 bg-primary/5 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">
          {count} guest{count === 1 ? "" : "s"} selected
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => {
            clearGuestSelection();
            setMessage(null);
          }}
        >
          Clear
        </button>
      </div>
      <select
        className="select select-bordered select-sm w-full"
        value=""
        onChange={(event) => {
          if (event.target.value) handleAssign(event.target.value);
          event.target.value = "";
        }}
      >
        <option value="" disabled>
          Assign to table…
        </option>
        {tables.map((table, index) => (
          <option key={table.id} value={table.id}>
            {tableDisplayName(table.label, index)}
          </option>
        ))}
      </select>
      {message && <span className="text-[11px] text-base-content/60">{message}</span>}
    </div>
  );
}
