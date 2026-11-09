interface ViewerZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

/** + / − / Fit over the chart: the visible equivalents of wheel and pinch. */
export function ViewerZoomControls({
  onZoomIn,
  onZoomOut,
  onFit,
}: ViewerZoomControlsProps): JSX.Element {
  return (
    <div className="join join-vertical absolute right-3 bottom-3 shadow-md">
      <button
        type="button"
        className="btn join-item btn-sm"
        aria-label="Zoom in"
        onClick={onZoomIn}
      >
        +
      </button>
      <button
        type="button"
        className="btn join-item btn-sm"
        aria-label="Zoom out"
        onClick={onZoomOut}
      >
        −
      </button>
      <button
        type="button"
        className="btn join-item btn-sm"
        aria-label="Fit the whole chart"
        onClick={onFit}
      >
        Fit
      </button>
    </div>
  );
}
