import { blurActiveElement } from "../../../lib/blurActiveElement";
import { PRINT_KINDS, usePrintStore } from "../../export/store/printStore";

/** "Print ▾": the export feature's print views, starting on the layout being viewed. */
export function ViewerPrintMenu({ layoutId }: { layoutId: string }): JSX.Element {
  const openPrint = usePrintStore((state) => state.open);
  return (
    <div className="dropdown dropdown-end">
      <button type="button" tabIndex={0} className="btn btn-ghost btn-sm">
        Print ▾
      </button>
      <ul className="dropdown-content menu z-30 mt-1 w-56 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        <li className="menu-title">Print or save as PDF</li>
        {PRINT_KINDS.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              onClick={() => {
                blurActiveElement();
                openPrint(option.value, layoutId);
              }}
            >
              {option.label}…
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
