import { ROOM_OBJECT_DEFAULTS, type RoomObject } from "@seating/shared";

import { NumberField } from "../../../../components/NumberField";
import { useUnits } from "../../hooks/useDocumentSelectors";
import { fromSmallUnit, smallUnitLabel, toSmallUnit } from "../../lib/units";
import { useEditorStore } from "../../store/editorStore";
import { labelClass } from "./propertyStyles";

const ROTATIONS = [0, 45, 90, 135] as const;

/** One room object selected: its label, size, rotation, or delete it. */
export function RoomObjectEditor({ object }: { object: RoomObject }): JSX.Element {
  const updateRoomObject = useEditorStore((state) => state.updateRoomObject);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const { units } = useUnits();
  const unit = smallUnitLabel(units);
  const rotation = ((Math.round(object.rotation) % 180) + 180) % 180;
  const isLabel = object.kind === "label";

  return (
    <div className="flex flex-col gap-3.5 text-base-content">
      <p className="text-xs text-base-content/60">{ROOM_OBJECT_DEFAULTS[object.kind].name}</p>
      <div>
        <label className={labelClass} htmlFor="object-label">
          {isLabel ? "Text" : "Label"}
        </label>
        <input
          id="object-label"
          className="input input-sm w-full"
          value={object.label}
          onChange={(event) => updateRoomObject(object.id, { label: event.target.value })}
        />
      </div>
      <div className="flex gap-2">
        {(["width", "height"] as const).map((side) => (
          <div key={side} className="flex-1">
            <label className={labelClass} htmlFor={`object-${side}`}>
              {side === "width" ? "Width" : "Depth"} ({unit})
            </label>
            <NumberField
              id={`object-${side}`}
              min={1}
              step={units === "imperial" ? 6 : 10}
              emptyValue={toSmallUnit(object.size[side], units)}
              className="w-full"
              value={toSmallUnit(object.size[side], units)}
              onChange={(value) =>
                updateRoomObject(object.id, {
                  size: { ...object.size, [side]: fromSmallUnit(value, units) },
                })
              }
            />
          </div>
        ))}
      </div>
      <div>
        <span className={labelClass}>Rotation</span>
        <div className="join w-full">
          {ROTATIONS.map((deg) => (
            <button
              key={deg}
              type="button"
              className={`btn join-item btn-sm flex-1 ${rotation === deg ? "btn-primary" : "btn-outline"}`}
              onClick={() => updateRoomObject(object.id, { rotation: deg })}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="btn btn-sm btn-error btn-outline" onClick={deleteSelected}>
        Delete {ROOM_OBJECT_DEFAULTS[object.kind].name.toLowerCase()}
      </button>
    </div>
  );
}
