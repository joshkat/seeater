import { useState } from "react";

import { THEMES, type ThemeValue, applyTheme, getSavedTheme } from "../../../lib/theme";
import { useEditorStore } from "../store/editorStore";

/** Top toolbar: add tables, act on the current selection, and pick a theme. */
export function Toolbar(): JSX.Element {
  const addTable = useEditorStore((state) => state.addTable);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const hasSelection = useEditorStore((state) => state.selectedIds.length > 0);

  const [currentTheme, setCurrentTheme] = useState<ThemeValue>(getSavedTheme);

  function handleThemeChange(theme: ThemeValue): void {
    applyTheme(theme);
    setCurrentTheme(theme);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => addTable("round")}>
          + Round table
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => addTable("rectangle")}
        >
          + Rectangle table
        </button>
        <span className="mx-1 h-6 w-px bg-base-300" />
        <button
          type="button"
          className="btn btn-sm"
          disabled={!hasSelection}
          onClick={duplicateSelected}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="btn btn-sm btn-error"
          disabled={!hasSelection}
          onClick={deleteSelected}
        >
          Delete
        </button>
      </div>

      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn btn-sm btn-secondary">
          Theme ▾
        </div>
        <ul className="dropdown-content menu z-20 mt-1 w-40 rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
          {THEMES.map((theme) => (
            <li key={theme.value}>
              <button
                type="button"
                className={`w-full rounded px-3 py-1.5 text-left text-sm ${
                  currentTheme === theme.value
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-200"
                }`}
                onClick={() => handleThemeChange(theme.value)}
              >
                {theme.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
