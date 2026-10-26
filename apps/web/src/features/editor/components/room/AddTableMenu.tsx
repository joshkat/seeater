import { useState } from "react";

import { blurActiveElement } from "../../../../lib/blurActiveElement";
import { TableGridDialog } from "./TableGridDialog";
import { TableMenuItems } from "./TableMenuItems";

/** "+ More ▾": real-size table presets, a row of chairs, and a grid of tables. */
export function AddTableMenu(): JSX.Element {
  const [gridOpen, setGridOpen] = useState(false);

  return (
    <>
      <div className="dropdown">
        <button type="button" tabIndex={0} className="btn btn-primary btn-sm btn-outline">
          + More ▾
        </button>
        <ul className="dropdown-content menu z-30 mt-1 w-60 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
          <TableMenuItems onPick={blurActiveElement} onOpenGrid={() => setGridOpen(true)} />
        </ul>
      </div>
      {gridOpen && <TableGridDialog onClose={() => setGridOpen(false)} />}
    </>
  );
}
