import { ThemeMenu } from "../../../components/ThemeMenu";
import { COARSE_POINTER_QUERY, DESKTOP_QUERY, useMediaQuery } from "../../../lib/useMediaQuery";
import { useEditorStore } from "../store/editorStore";
import { useLayoutStore } from "../store/layoutStore";
import { useShortcutsDialogStore } from "../store/shortcutsDialogStore";
import { ClipboardButtons } from "./ClipboardButtons";
import { GuestsDrawerToggle } from "./GuestsDrawerToggle";
import { AddRoomObjectMenu } from "./room/AddRoomObjectMenu";
import { AddTableMenu } from "./room/AddTableMenu";
import { SelectMenu } from "./SelectMenu";
import { ToolbarOverflowMenu } from "./ToolbarOverflowMenu";
import { UndoRedoButtons } from "./UndoRedoButtons";

/** Every "+ add to the room" button looks the same: outlined in the accent
 * colour, so the group reads as one family next to the grey edit buttons. */
const addClass = "btn btn-primary btn-outline btn-sm";

/**
 * Top toolbar (tablet and desktop; phones use PhoneBottomBar): add tables,
 * act on the selection, and the theme.
 *
 * Exact seat placement is in Properties at every width. Below `xl` (every
 * iPad) the toolbar slims down to one row: Duplicate, Copy and Paste move into
 * Select ▾, rectangles into + Tables, Redo and the theme into "⋯", and the
 * separators go. Touch screens get no ⌨ button. It has little slack on an
 * 834px iPad with 44px touch targets: check ux-toolbar.spec in CI (Linux
 * fonts are wider) before adding anything here.
 */
export function Toolbar(): JSX.Element {
  const addTable = useEditorStore((state) => state.addTable);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const hasSelection = useEditorStore((state) => state.selectedIds.length > 0);
  const propertiesOpen = useLayoutStore((state) => state.propertiesOpen);
  const setPropertiesOpen = useLayoutStore((state) => state.setPropertiesOpen);
  const openShortcuts = useShortcutsDialogStore((state) => state.setOpen);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const coarse = useMediaQuery(COARSE_POINTER_QUERY);

  return (
    <div
      role="group"
      aria-label="Editor tools"
      className="flex flex-wrap items-center justify-between gap-1.5 xl:gap-2"
    >
      <div className="flex flex-wrap items-center gap-1.5 xl:gap-2">
        {/* Tablet widths: the side panels are drawers, opened from here. */}
        {!desktop && <GuestsDrawerToggle />}
        <UndoRedoButtons showRedo={desktop} />
        {desktop && <span className="mx-1 h-6 w-px bg-base-300" />}
        <button type="button" className={addClass} onClick={() => addTable("round")}>
          + Round
        </button>
        {/* Below xl, rectangles come from + More (banquet and head tables),
            so an iPad's toolbar fits on one row. */}
        {desktop && (
          <button type="button" className={addClass} onClick={() => addTable("rectangle")}>
            + Rectangle
          </button>
        )}
        <AddTableMenu />
        <AddRoomObjectMenu />
        {desktop && <span className="mx-1 h-6 w-px bg-base-300" />}
        <SelectMenu actions={desktop ? [] : ["duplicate", "copy", "paste"]} />
        {desktop && (
          <>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!hasSelection}
              onClick={duplicateSelected}
            >
              Duplicate
            </button>
            <ClipboardButtons />
          </>
        )}
        <button
          type="button"
          className="btn btn-error btn-outline btn-sm"
          disabled={!hasSelection}
          onClick={deleteSelected}
        >
          Delete
        </button>
      </div>

      <div className="flex items-center gap-1.5 xl:gap-2">
        {!desktop && (
          <button
            type="button"
            aria-pressed={propertiesOpen}
            title="Table properties"
            className={`btn btn-sm ${
              propertiesOpen ? "btn-active" : hasSelection ? "btn-primary" : ""
            }`}
            onClick={() => setPropertiesOpen(!propertiesOpen)}
          >
            Properties
          </button>
        )}
        {desktop ? (
          <>
            {/* Touch screens have no keyboard to need a cheat sheet. */}
            {!coarse && (
              <button
                type="button"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
                className="btn btn-square btn-sm"
                onClick={() => openShortcuts(true)}
              >
                ⌨
              </button>
            )}
            <ThemeMenu />
          </>
        ) : (
          <ToolbarOverflowMenu />
        )}
      </div>
    </div>
  );
}
