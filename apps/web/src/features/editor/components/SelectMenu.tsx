import { blurActiveElement } from "../../../lib/blurActiveElement";
import { useClipboardStore } from "../store/clipboardStore";
import { copySelection } from "../store/clipboardActions";
import { useEditorStore } from "../store/editorStore";

/** Selection actions that live in this menu where the toolbar has no room for
 * their buttons (see Toolbar). */
export type SelectMenuAction = "duplicate" | "copy" | "paste" | "delete";

interface SelectMenuProps {
  actions?: SelectMenuAction[];
  /** Extra DaisyUI dropdown placement classes, e.g. "dropdown-top" in the
   * phone's bottom bar. */
  placement?: string;
}

/**
 * "Select ▾": the visible way to select several things (no Shift needed),
 * select all and clear, plus any selection actions the toolbar can't fit.
 */
export function SelectMenu({ actions = [], placement = "" }: SelectMenuProps): JSX.Element {
  const selectSeveral = useEditorStore((state) => state.selectSeveral);
  const count = useEditorStore((state) => state.selectedIds.length);
  const clipboard = useClipboardStore((state) => state.items);
  const pasteCount = clipboard ? clipboard.tables.length + clipboard.objects.length : 0;

  const run = (action: () => void) => (): void => {
    blurActiveElement();
    action();
  };
  const editor = useEditorStore.getState;

  return (
    <div className={`dropdown ${placement}`}>
      <button
        type="button"
        tabIndex={0}
        className={`btn btn-sm ${selectSeveral ? "btn-active" : ""}`}
      >
        Select ▾
      </button>
      <ul className="dropdown-content menu z-30 my-1 w-56 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        <li>
          <button
            type="button"
            aria-pressed={selectSeveral}
            onClick={run(() => editor().setSelectSeveral(!selectSeveral))}
          >
            <span aria-hidden className="w-4">
              {selectSeveral ? "✓" : ""}
            </span>
            Select several
          </button>
        </li>
        <li>
          <button type="button" onClick={run(() => editor().selectAll())}>
            <span aria-hidden className="w-4" />
            Select all
          </button>
        </li>
        <li className={count === 0 ? "menu-disabled" : ""}>
          <button
            type="button"
            disabled={count === 0}
            onClick={run(() => {
              editor().clearSelection();
              editor().setSelectSeveral(false);
            })}
          >
            <span aria-hidden className="w-4" />
            Clear selection
          </button>
        </li>
        {actions.length > 0 && <li className="menu-title">Selection</li>}
        {actions.includes("duplicate") && (
          <li className={count === 0 ? "menu-disabled" : ""}>
            <button
              type="button"
              disabled={count === 0}
              onClick={run(() => editor().duplicateSelected())}
            >
              Duplicate
            </button>
          </li>
        )}
        {actions.includes("copy") && (
          <li className={count === 0 ? "menu-disabled" : ""}>
            <button type="button" disabled={count === 0} onClick={run(copySelection)}>
              Copy
            </button>
          </li>
        )}
        {actions.includes("paste") && (
          <li className={pasteCount === 0 ? "menu-disabled" : ""}>
            <button type="button" disabled={pasteCount === 0} onClick={run(() => editor().paste())}>
              {pasteCount > 0 ? `Paste (${pasteCount})` : "Paste"}
            </button>
          </li>
        )}
        {actions.includes("delete") && (
          <li className={count === 0 ? "menu-disabled" : ""}>
            <button
              type="button"
              disabled={count === 0}
              className="text-error-strong"
              onClick={run(() => editor().deleteSelected())}
            >
              Delete
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
