import { useEditorStore } from "../../store/editorStore";

/** Over the canvas while "Select several" is on: what to do, how many are
 * picked, and Done to leave the mode (the selection stays). */
export function SelectSeveralChip(): JSX.Element | null {
  const on = useEditorStore((state) => state.selectSeveral);
  const count = useEditorStore((state) => state.selectedIds.length);
  const setSelectSeveral = useEditorStore((state) => state.setSelectSeveral);
  if (!on) return null;

  return (
    <div
      role="status"
      aria-label="Selecting several"
      className="absolute left-1/2 top-16 z-20 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-box bg-primary py-1 pl-3 pr-1 text-sm text-primary-content shadow-lg"
    >
      <span className="whitespace-nowrap">
        <strong>{count} selected</strong>
        {/* Phones: just the count, so it clears the zoom buttons. */}
        <span className="max-sm:hidden"> · tap or drag a box to add</span>
      </span>
      <button type="button" className="btn btn-sm" onClick={() => setSelectSeveral(false)}>
        Done
      </button>
    </div>
  );
}
