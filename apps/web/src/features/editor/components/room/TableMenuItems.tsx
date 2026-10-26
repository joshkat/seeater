import { TABLE_PRESETS } from "@seating/shared";

import { useUnits } from "../../hooks/useDocumentSelectors";
import { presetLabel } from "../../lib/presetLabel";
import { useEditorStore } from "../../store/editorStore";

interface TableMenuItemsProps {
  /** Closes the surrounding menu after a pick. */
  onPick: () => void;
  onOpenGrid: () => void;
}

/** Real-size table presets and "Grid of tables…", as menu rows (used by
 * "+ Tables ▾" and the phone's "+ Add ▾"). */
export function TableMenuItems({ onPick, onOpenGrid }: TableMenuItemsProps): JSX.Element {
  const addPresetTable = useEditorStore((state) => state.addPresetTable);
  const { units } = useUnits();

  return (
    <>
      <li className="menu-title">Tables (real sizes)</li>
      {TABLE_PRESETS.map((preset) => (
        <li key={preset.id}>
          <button
            type="button"
            onClick={() => {
              onPick();
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
            onPick();
            onOpenGrid();
          }}
        >
          Grid of tables…
        </button>
      </li>
    </>
  );
}
