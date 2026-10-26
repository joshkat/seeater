import type { Table } from "@seating/shared";
import { MAX_SEAT_COUNT } from "@seating/shared";

import { NumberField } from "../../../../components/NumberField";
import { useSeatingFlowStore } from "../../../guests/store/seatingFlowStore";
import { useUnits } from "../../hooks/useDocumentSelectors";
import { tableDisplayName } from "../../lib/tableLabel";
import { fromSmallUnit, smallUnitLabel, toSmallUnit } from "../../lib/units";
import { useEditorStore } from "../../store/editorStore";
import { labelClass } from "./propertyStyles";
import { TightChairsHint } from "./TightChairsHint";

/** Smallest table width/height (matches the canvas resize limit). */
const MIN_TABLE_SIZE = 40;

/** Rotation presets — 0° and 90° cover every practical table orientation. */
const ROTATIONS = [0, 90] as const;

/** Editing one selected table: name, seating, chairs, size and rotation. */
export function SingleTableEditor({ table, index }: { table: Table; index: number }): JSX.Element {
  const setTableLabel = useEditorStore((state) => state.setTableLabel);
  const setSeatCount = useEditorStore((state) => state.setSeatCount);
  const setChairMode = useEditorStore((state) => state.setChairMode);
  const updateTableTransform = useEditorStore((state) => state.updateTableTransform);
  const openPlacement = useSeatingFlowStore((state) => state.openPlacement);

  const { units } = useUnits();
  const isRound = table.shape === "round";
  const isRow = table.shape === "row";
  const sizeUnit = smallUnitLabel(units);
  // Inputs work in whole inches or centimetres; the document stores cm.
  const minSize = toSmallUnit(MIN_TABLE_SIZE, units);
  const sizeStep = units === "imperial" ? 6 : 10;
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
        <p className="mt-1 text-[11px] text-base-content/70">
          Leave blank to use “{tableDisplayName("", index)}”.
        </p>
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={table.seats.length === 0}
        title="Pick who sits in which chair (also: double-click the table)"
        onClick={() => openPlacement(table.id, [])}
      >
        Edit seating
      </button>

      <div>
        <label className={labelClass} htmlFor="seat-count">
          Chairs ({table.seats.length})
        </label>
        <NumberField
          id="seat-count"
          min={1}
          max={MAX_SEAT_COUNT}
          // Blank keeps the current count: clearing the box to retype must
          // not drop the table to one chair and unseat everyone.
          emptyValue={table.seats.length}
          className="w-full"
          value={table.seats.length}
          onChange={(count) => setSeatCount(table.id, count)}
        />
        <TightChairsHint table={table} units={units} />
      </div>

      {!isRow && (
        <div>
          <span className={labelClass}>Chair layout</span>
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
      )}

      {/* A row's length follows its chair count. */}
      {!isRow && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass} htmlFor="table-width">
              {isRound ? "Diameter" : "Width"} ({sizeUnit})
            </label>
            <NumberField
              id="table-width"
              min={minSize}
              step={sizeStep}
              // Blank keeps the current size rather than shrinking to the minimum.
              emptyValue={toSmallUnit(table.size.width, units)}
              className="w-full"
              value={toSmallUnit(table.size.width, units)}
              onChange={(value) => {
                const width = fromSmallUnit(value, units);
                updateTableTransform(table.id, {
                  size: { width, height: isRound ? width : table.size.height },
                });
              }}
            />
          </div>
          {!isRound && (
            <div className="flex-1">
              <label className={labelClass} htmlFor="table-height">
                Depth ({sizeUnit})
              </label>
              <NumberField
                id="table-height"
                min={minSize}
                step={sizeStep}
                emptyValue={toSmallUnit(table.size.height, units)}
                className="w-full"
                value={toSmallUnit(table.size.height, units)}
                onChange={(value) =>
                  updateTableTransform(table.id, {
                    size: { width: table.size.width, height: fromSmallUnit(value, units) },
                  })
                }
              />
            </div>
          )}
        </div>
      )}

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
