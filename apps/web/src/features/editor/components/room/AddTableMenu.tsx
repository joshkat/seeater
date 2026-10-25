import { TABLE_PRESETS } from "@seating/shared";
import { useState } from "react";

import { useUnits } from "../../hooks/useDocumentSelectors";
import { presetLabel } from "../../lib/presetLabel";
import { useEditorStore } from "../../store/editorStore";
import { TableGridDialog } from "./TableGridDialog";

/** "+ Tables ▾": real-size table presets, a row of chairs, and a grid of tables. */
export function AddTableMenu(): JSX.Element {
  const addPresetTable = useEditorStore((state) => state.addPresetTable);
  const { units } = useUnits();
  const [gridOpen, setGridOpen] = useState(false);

  const closeMenu = (): void => (document.activeElement as HTMLElement | null)?.blur();

  return (
    <>
      <div className="dropdown">
        <button type="button" tabIndex={0} className="btn btn-primary btn-sm btn-outline">
          + Tables ▾
        </button>
        <ul className="dropdown-content menu z-30 mt-1 w-60 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
          <li className="menu-title">Tables (real sizes)</li>
          {TABLE_PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  addPresetTable(preset);
                }}
              >
                {presetLabel(preset, units)}
              </button>
            </li>
          ))}
          <li className="menu-title">Several at once</li>
          <li>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                setGridOpen(true);
              }}
            >
              Grid of tables…
            </button>
          </li>
        </ul>
      </div>
      {gridOpen && <TableGridDialog onClose={() => setGridOpen(false)} />}
    </>
  );
}
