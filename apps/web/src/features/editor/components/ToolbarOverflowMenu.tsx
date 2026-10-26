import { Link } from "react-router";

import { ThemeMenuItems } from "../../../components/ThemeMenuItems";
import { blurActiveElement } from "../../../lib/blurActiveElement";
import { COARSE_POINTER_QUERY, useMediaQuery } from "../../../lib/useMediaQuery";
import { ExportMenuItems } from "../../export/components/ExportMenuItems";
import { useVersionDialogStore } from "../../versions/store/versionDialogStore";
import { useDocumentId, useHistoryAvailability } from "../hooks/useDocumentSelectors";
import { redoEdit } from "../store/historyActions";
import { useLayoutStore } from "../store/layoutStore";
import { useShortcutsDialogStore } from "../store/shortcutsDialogStore";

/**
 * "⋯" at the end of the toolbar below `xl`, for what doesn't fit: the theme,
 * and the cheat sheet when there's a keyboard. On phones (`phone`) it also
 * holds what the header and toolbar drop there: Redo, Properties, Export,
 * History and Check-in.
 */
export function ToolbarOverflowMenu({ phone = false }: { phone?: boolean }): JSX.Element {
  const coarse = useMediaQuery(COARSE_POINTER_QUERY);
  const eventId = useDocumentId();
  const { canRedo } = useHistoryAvailability();
  const propertiesOpen = useLayoutStore((state) => state.propertiesOpen);
  const setPropertiesOpen = useLayoutStore((state) => state.setPropertiesOpen);

  const run = (action: () => void) => (): void => {
    blurActiveElement();
    action();
  };

  return (
    <div className={`dropdown dropdown-end ${phone ? "dropdown-top" : ""}`}>
      <button type="button" tabIndex={0} aria-label="More options" className="btn btn-sm">
        ⋯
      </button>
      <ul className="dropdown-content menu z-30 my-1 max-h-[70vh] w-56 flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        {phone && (
          <>
            <li className={canRedo ? "" : "menu-disabled"}>
              <button type="button" disabled={!canRedo} onClick={run(redoEdit)}>
                ↷ Redo
              </button>
            </li>
            <li>
              <button
                type="button"
                aria-pressed={propertiesOpen}
                onClick={run(() => setPropertiesOpen(!propertiesOpen))}
              >
                Properties
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={run(() => useVersionDialogStore.getState().setOpen(true))}
              >
                History
              </button>
            </li>
            {eventId && (
              <li>
                <Link to={`/events/${eventId}/check-in`} onClick={blurActiveElement}>
                  Check-in
                </Link>
              </li>
            )}
            <ExportMenuItems onPick={blurActiveElement} />
          </>
        )}
        {!coarse && !phone && (
          <li>
            <button
              type="button"
              onClick={run(() => useShortcutsDialogStore.getState().setOpen(true))}
            >
              Keyboard shortcuts
            </button>
          </li>
        )}
        <li className="menu-title">Theme</li>
        <ThemeMenuItems onPick={blurActiveElement} />
      </ul>
    </div>
  );
}
