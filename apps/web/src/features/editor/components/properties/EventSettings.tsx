import type { UnitSystem } from "@seating/shared";

import { NumberField } from "../../../../components/NumberField";
import { DESKTOP_QUERY, useMediaQuery } from "../../../../lib/useMediaQuery";
import { ExactPlacementToggle } from "../ExactPlacementToggle";
import { useDimensions, useUnits } from "../../hooks/useDocumentSelectors";
import { fromLargeUnit, largeUnitLabel, toLargeUnit } from "../../lib/units";
import { useEditorStore } from "../../store/editorStore";
import { FloorPlanImageSettings } from "./FloorPlanImageSettings";
import { labelClass } from "./propertyStyles";

/** Nothing selected: the event's units and floor size, plus a hint. */
export function EventSettings(): JSX.Element {
  const { setting, units } = useUnits();
  const dimensions = useDimensions();
  const setUnits = useEditorStore((state) => state.setUnits);
  const setFloorSize = useEditorStore((state) => state.setFloorSize);
  const unit = largeUnitLabel(units);
  // Below xl (phones and every iPad) the toolbar has no room for this
  // switch, so it lives here.
  const desktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <div className="flex flex-col gap-3.5 text-base-content">
      <p className="text-sm text-base-content/60">
        Select a table to edit it. Add tables from the toolbar, drag to move, and use the handles to
        rotate or resize.
      </p>
      <p className="text-xs text-base-content/70">
        To line up tables, choose Select ▾ → Select several.
      </p>
      {!desktop && <ExactPlacementToggle />}
      <div>
        <label className={labelClass} htmlFor="event-units">
          Units
        </label>
        <select
          id="event-units"
          className="select select-sm w-full"
          value={setting}
          onChange={(event) => setUnits(event.target.value as UnitSystem)}
        >
          <option value="auto">
            Automatic ({units === "imperial" ? "feet & inches" : "metres & cm"})
          </option>
          <option value="metric">Metres &amp; centimetres</option>
          <option value="imperial">Feet &amp; inches</option>
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass} htmlFor="floor-width">
            Room width ({unit})
          </label>
          <NumberField
            id="floor-width"
            min={toLargeUnit(200, units) || 1}
            emptyValue={toLargeUnit(dimensions.width, units)}
            className="w-full"
            value={toLargeUnit(dimensions.width, units)}
            onChange={(value) =>
              setFloorSize({ width: fromLargeUnit(value, units), height: dimensions.height })
            }
          />
        </div>
        <div className="flex-1">
          <label className={labelClass} htmlFor="floor-depth">
            Room depth ({unit})
          </label>
          <NumberField
            id="floor-depth"
            min={toLargeUnit(200, units) || 1}
            emptyValue={toLargeUnit(dimensions.height, units)}
            className="w-full"
            value={toLargeUnit(dimensions.height, units)}
            onChange={(value) =>
              setFloorSize({ width: dimensions.width, height: fromLargeUnit(value, units) })
            }
          />
        </div>
      </div>
      <FloorPlanImageSettings />
    </div>
  );
}
