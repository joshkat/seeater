import { EXACT_SEAT_PLACEMENT_MAX_TABLES } from "@seating/shared";

import { useExactSeatPlacement } from "../hooks/useDocumentSelectors";
import { useEditorStore } from "../store/editorStore";

/** Toolbar switch for this event's "Exact seat placement" setting. Until it's
 * touched it follows the event's size ("auto"). */
export function ExactPlacementToggle(): JSX.Element {
  const { mode, active } = useExactSeatPlacement();
  const setExactSeatPlacement = useEditorStore((state) => state.setExactSeatPlacement);

  return (
    <label
      className="label min-h-8 cursor-pointer gap-2 text-sm text-base-content"
      title={`When on, seating several guests at a table opens a seat-by-seat picker. By default it's on for events with ${EXACT_SEAT_PLACEMENT_MAX_TABLES} or fewer tables.`}
    >
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={active}
        onChange={(event) => setExactSeatPlacement(event.target.checked ? "on" : "off")}
      />
      Exact seat placement
      {mode === "auto" && <span className="badge badge-ghost badge-sm">auto</span>}
    </label>
  );
}
