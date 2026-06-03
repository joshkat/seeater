import { BUTTON_ZOOM, isAwayFromHome } from "../../geometry/viewport";
import { useEditorStore } from "../../store/editorStore";

/** Floating zoom controls (top-left of the canvas). Reset only appears once
 * the view has moved away from the fit-to-view home (e.g. focused on a table). */
export function ZoomControls(): JSX.Element {
  const zoomBy = useEditorStore((state) => state.zoomBy);
  const resetView = useEditorStore((state) => state.resetView);
  const viewport = useEditorStore((state) => state.viewport);
  const homeViewport = useEditorStore((state) => state.homeViewport);
  const focusedTableId = useEditorStore((state) => state.focusedTableId);

  const showReset = focusedTableId !== null || isAwayFromHome(viewport, homeViewport);

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
      <button
        type="button"
        className="btn btn-square btn-sm bg-base-100 shadow"
        title="Zoom in"
        aria-label="Zoom in"
        onClick={() => zoomBy(BUTTON_ZOOM)}
      >
        +
      </button>
      <button
        type="button"
        className="btn btn-square btn-sm bg-base-100 shadow"
        title="Zoom out"
        aria-label="Zoom out"
        onClick={() => zoomBy(1 / BUTTON_ZOOM)}
      >
        -
      </button>
      {showReset && (
        <button
          type="button"
          className="btn btn-sm bg-base-100 shadow"
          title="Reset view"
          onClick={resetView}
        >
          Reset
        </button>
      )}
    </div>
  );
}
