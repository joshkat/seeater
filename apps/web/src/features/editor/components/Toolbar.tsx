import { useState } from "react";

import { THEMES, type ThemeValue, applyTheme, getSavedTheme } from "../../../lib/theme";
import { PHONE_QUERY, useMediaQuery } from "../../../lib/useMediaQuery";
import { useEditorStore } from "../store/editorStore";
import { useLayoutStore } from "../store/layoutStore";
import { ExactPlacementToggle } from "./ExactPlacementToggle";
import { AddRoomObjectMenu } from "./room/AddRoomObjectMenu";
import { AddTableMenu } from "./room/AddTableMenu";
import { UndoRedoButtons } from "./UndoRedoButtons";

/** Top toolbar: add tables, act on the current selection, and pick a theme. */
export function Toolbar(): JSX.Element {
  const addTable = useEditorStore((state) => state.addTable);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const hasSelection = useEditorStore((state) => state.selectedIds.length > 0);
  const guestsOpen = useLayoutStore((state) => state.guestsOpen);
  const propertiesOpen = useLayoutStore((state) => state.propertiesOpen);
  const setGuestsOpen = useLayoutStore((state) => state.setGuestsOpen);
  const setPropertiesOpen = useLayoutStore((state) => state.setPropertiesOpen);

  // Phones: the toolbar keeps the essentials (exact placement moves to the
  // Properties panel; Duplicate / Delete appear once something is selected).
  const phone = useMediaQuery(PHONE_QUERY);
  const [currentTheme, setCurrentTheme] = useState<ThemeValue>(getSavedTheme);

  function handleThemeChange(theme: ThemeValue): void {
    applyTheme(theme);
    setCurrentTheme(theme);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 max-sm:justify-start">
      {/* Phones: both groups flow together (display: contents). */}
      <div className="flex flex-wrap items-center gap-2 max-sm:contents">
        {/* Tablet widths: the side panels are drawers, opened from here. */}
        <button
          type="button"
          aria-pressed={guestsOpen}
          className={`btn btn-sm xl:hidden ${guestsOpen ? "btn-active" : "btn-outline"}`}
          onClick={() => setGuestsOpen(!guestsOpen)}
        >
          Guests
        </button>
        <UndoRedoButtons />
        <span className="mx-1 h-6 w-px bg-base-300 max-sm:hidden" />
        <button type="button" className="btn btn-primary btn-sm" onClick={() => addTable("round")}>
          + Round<span className="max-xl:hidden"> table</span>
        </button>
        {/* Phones: rectangles are in + More (banquet tables). */}
        {!phone && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => addTable("rectangle")}
          >
            + Rectangle<span className="max-xl:hidden"> table</span>
          </button>
        )}
        <AddTableMenu />
        <AddRoomObjectMenu />
        <span className="mx-1 h-6 w-px bg-base-300 max-sm:hidden" />
        {(!phone || hasSelection) && (
          <>
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
          </>
        )}
        {!phone && (
          <>
            <span className="mx-1 h-6 w-px bg-base-300" />
            <ExactPlacementToggle />
          </>
        )}
      </div>

      <div className="flex items-center gap-2 max-sm:contents">
        <button
          type="button"
          aria-pressed={propertiesOpen}
          title="Table properties"
          className={`btn btn-sm xl:hidden ${
            propertiesOpen ? "btn-active" : hasSelection ? "btn-primary" : "btn-outline"
          }`}
          onClick={() => setPropertiesOpen(!propertiesOpen)}
        >
          Properties
        </button>
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            aria-label="Theme"
            className="btn btn-sm btn-secondary whitespace-nowrap"
          >
            <span className="max-sm:hidden">Theme ▾</span>
            <span aria-hidden className="sm:hidden">
              ◐
            </span>
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
    </div>
  );
}
