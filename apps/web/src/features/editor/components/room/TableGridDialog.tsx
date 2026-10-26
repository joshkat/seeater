import { TABLE_PRESETS } from "@seating/shared";
import { type FormEvent, useRef, useState } from "react";

import { useModalFocus } from "../../../../lib/useModalFocus";
import { NumberField } from "../../../../components/NumberField";
import { useSeatingFlowStore } from "../../../guests/store/seatingFlowStore";
import { useUnits } from "../../hooks/useDocumentSelectors";
import { presetLabel } from "../../lib/presetLabel";
import { useEditorStore } from "../../store/editorStore";

/** "Grid of tables": how many, how many per row, and which kind. */
export function TableGridDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const boxRef = useRef<HTMLFormElement>(null);
  useModalFocus(boxRef);
  const addTableGrid = useEditorStore((state) => state.addTableGrid);
  const [count, setCount] = useState(10);
  const [columns, setColumns] = useState(5);
  const [presetId, setPresetId] = useState("round-60");
  const preset = TABLE_PRESETS.find((candidate) => candidate.id === presetId) ?? TABLE_PRESETS[0];
  const { units } = useUnits();

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const placed = addTableGrid({ count, columns, preset });
    onClose();
    if (!placed) {
      useSeatingFlowStore
        .getState()
        .showNotice("These tables overlap others. They’re selected, so drag them into place.");
    }
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Grid of tables">
      <form
        onSubmit={handleSubmit}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
        ref={boxRef}
        className="modal-box flex max-w-sm flex-col gap-3 text-base-content"
      >
        <h2 className="text-lg font-semibold">Grid of tables</h2>
        <label>
          <span className="mb-1 block text-xs font-semibold">Table</span>
          <select
            className="select select-sm w-full"
            value={presetId}
            onChange={(event) => setPresetId(event.target.value)}
          >
            {TABLE_PRESETS.map((option) => (
              <option key={option.id} value={option.id}>
                {presetLabel(option, units)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold">How many</span>
            <NumberField
              min={1}
              max={100}
              value={count}
              onChange={setCount}
              aria-label="How many tables"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold">Per row</span>
            <NumberField
              min={1}
              max={20}
              value={columns}
              onChange={setColumns}
              aria-label="Tables per row"
            />
          </label>
        </div>
        <p className="text-xs text-base-content/60">
          {count} × {presetLabel(preset, units)} = {count * preset.seatCount} seats, centred on your
          screen.
        </p>
        <div className="modal-action mt-1">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            Add tables
          </button>
        </div>
      </form>
    </div>
  );
}
