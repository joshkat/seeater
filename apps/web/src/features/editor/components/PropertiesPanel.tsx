import type { Table } from "@seating/shared";

import { useTables } from "../hooks/useDocumentSelectors";
import { tableDisplayName } from "../lib/tableLabel";
import { useEditorStore } from "../store/editorStore";

const labelClass = "mb-1 block text-xs font-semibold text-secondary";

/** Rotation presets — 0° and 90° cover every practical table orientation. */
const ROTATIONS = [0, 90] as const;

function SingleTableEditor({ table, index }: { table: Table; index: number }): JSX.Element {
  const setTableLabel = useEditorStore((state) => state.setTableLabel);
  const setSeatCount = useEditorStore((state) => state.setSeatCount);
  const setChairMode = useEditorStore((state) => state.setChairMode);
  const updateTableTransform = useEditorStore((state) => state.updateTableTransform);

  const isRound = table.shape === "round";
  const rotation = ((Math.round(table.rotation) % 360) + 360) % 360;

  return (
    <div className="flex flex-col gap-3.5 text-base-content">
      <div>
        <label className={labelClass} htmlFor="table-label">
          Name
        </label>
        <input
          id="table-label"
          className="input input-bordered input-sm w-full"
          value={table.label}
          placeholder={tableDisplayName("", index)}
          onChange={(event) => setTableLabel(table.id, event.target.value)}
        />
        <p className="mt-1 text-[11px] text-base-content/40">
          Leave blank to use “{tableDisplayName("", index)}”.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="seat-count">
          Chairs ({table.seats.length})
        </label>
        <input
          id="seat-count"
          type="number"
          min={1}
          max={64}
          className="input input-bordered input-sm w-full"
          value={table.seats.length}
          onChange={(event) => setSeatCount(table.id, Number(event.target.value))}
        />
      </div>

      <div>
        <span className={labelClass}>Chair Layout</span>
        <div className="join w-full">
          {(["auto", "custom"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setChairMode(table.id, mode)}
              className={`btn join-item btn-sm flex-1 capitalize ${
                table.chairLayoutMode === mode ? "btn-primary" : "btn-outline"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {table.chairLayoutMode === "custom" && (
          <p className="mt-1.5 text-xs text-base-content/60">
            Drag individual chairs on the canvas to reposition them.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass} htmlFor="table-width">
            {isRound ? "Diameter" : "Width"}
          </label>
          <input
            id="table-width"
            type="number"
            min={40}
            className="input input-bordered input-sm w-full"
            value={Math.round(table.size.width)}
            onChange={(event) => {
              const width = Math.max(40, Number(event.target.value));
              updateTableTransform(table.id, {
                size: { width, height: isRound ? width : table.size.height },
              });
            }}
          />
        </div>
        {!isRound && (
          <div className="flex-1">
            <label className={labelClass} htmlFor="table-height">
              Height
            </label>
            <input
              id="table-height"
              type="number"
              min={40}
              className="input input-bordered input-sm w-full"
              value={Math.round(table.size.height)}
              onChange={(event) =>
                updateTableTransform(table.id, {
                  size: {
                    width: table.size.width,
                    height: Math.max(40, Number(event.target.value)),
                  },
                })
              }
            />
          </div>
        )}
      </div>

      {/* Round tables look identical at any angle, so rotation is hidden for them. */}
      {!isRound && (
        <div>
          <span className={labelClass}>Rotation</span>
          <div className="join w-full">
            {ROTATIONS.map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => updateTableTransform(table.id, { rotation: deg })}
                className={`btn join-item btn-sm flex-1 ${
                  rotation === deg ? "btn-primary" : "btn-outline"
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Right-hand inspector for the current selection. */
export function PropertiesPanel(): JSX.Element {
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const tables = useTables();

  const selected = tables.filter((table) => selectedIds.includes(table.id));
  const selectedIndex = selected.length === 1 ? tables.indexOf(selected[0]) : -1;

  return (
    <aside className="w-65 shrink-0 overflow-y-auto border-l border-base-300 bg-base-100 p-4">
      <h2 className="mb-3 text-[15px] font-semibold text-base-content">Properties</h2>
      {selected.length === 0 && (
        <p className="text-sm text-base-content/60">
          Select a table to edit it. Add tables from the toolbar, drag to move, and use the handles
          to rotate or resize.
        </p>
      )}
      {selected.length === 1 && <SingleTableEditor table={selected[0]} index={selectedIndex} />}
      {selected.length > 1 && (
        <p className="text-sm text-base-content/60">{selected.length} tables selected.</p>
      )}
    </aside>
  );
}
