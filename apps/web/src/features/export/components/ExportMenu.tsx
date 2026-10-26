import { blurActiveElement } from "../../../lib/blurActiveElement";
import { ExportMenuItems } from "./ExportMenuItems";

/** Editor header: Export ▾ — print views, a PNG of the chart, the guest CSV. */
export function ExportMenu(): JSX.Element {
  return (
    <div className="dropdown dropdown-end">
      <button type="button" tabIndex={0} className="btn btn-ghost btn-sm">
        Export ▾
      </button>
      <ul className="dropdown-content menu z-30 mt-1 w-56 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        <ExportMenuItems onPick={blurActiveElement} />
      </ul>
    </div>
  );
}
