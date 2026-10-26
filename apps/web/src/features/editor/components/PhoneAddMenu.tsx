import { useState } from "react";

import { blurActiveElement } from "../../../lib/blurActiveElement";
import { useEditorStore } from "../store/editorStore";
import { RoomObjectMenuItems } from "./room/RoomObjectMenuItems";
import { TableGridDialog } from "./room/TableGridDialog";
import { TableMenuItems } from "./room/TableMenuItems";

/** The phone bottom bar's "+ Add ▾": round and rectangle tables, the
 * real-size presets, a grid, and room items, in one upward menu. */
export function PhoneAddMenu(): JSX.Element {
  const addTable = useEditorStore((state) => state.addTable);
  const [gridOpen, setGridOpen] = useState(false);

  return (
    <>
      <div className="dropdown dropdown-top">
        <button type="button" tabIndex={0} className="btn btn-primary btn-sm">
          + Add ▾
        </button>
        <ul className="dropdown-content menu z-30 my-1 max-h-[70vh] w-60 flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
          <li>
            <button
              type="button"
              onClick={() => {
                blurActiveElement();
                addTable("round");
              }}
            >
              + Round table
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                blurActiveElement();
                addTable("rectangle");
              }}
            >
              + Rectangle table
            </button>
          </li>
          <TableMenuItems onPick={blurActiveElement} onOpenGrid={() => setGridOpen(true)} />
          <li className="menu-title">Room items</li>
          <RoomObjectMenuItems onPick={blurActiveElement} />
        </ul>
      </div>
      {gridOpen && <TableGridDialog onClose={() => setGridOpen(false)} />}
    </>
  );
}
