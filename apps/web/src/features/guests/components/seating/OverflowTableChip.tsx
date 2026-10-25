import { useTablePreviewStore } from "../../../editor/store/tablePreviewStore";

interface OverflowTableChipProps {
  tableId: string;
  name: string;
  open: number;
  /** How many guests are waiting (all fit when `open` covers them). */
  count: number;
  /** Screen space the prompt covers at the bottom of the canvas, so a table
   * hidden behind it is panned into view. */
  coveredHeight: () => number;
  onPick: () => void;
}

/** One table to send the leftovers to. Hover or focus shows it on the canvas
 * (highlighted, panned into view if it's hidden). */
export function OverflowTableChip({
  tableId,
  name,
  open,
  count,
  coveredHeight,
  onPick,
}: OverflowTableChipProps): JSX.Element {
  const show = (): void => useTablePreviewStore.getState().preview(tableId, coveredHeight());
  const hide = (): void => useTablePreviewStore.getState().clear();

  return (
    <button
      type="button"
      title={open >= count ? "Everyone fits" : `Only ${open} fit`}
      className={`btn btn-sm ${open >= count ? "btn-success btn-soft" : "btn-outline"}`}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={onPick}
    >
      {name}
      <span className="badge badge-sm">{open} open</span>
    </button>
  );
}
