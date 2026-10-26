import { resetCheckIns } from "../lib/checkInActions";

/** The check-in header's "⋯" menu: rarely-needed actions, kept away from the
 * list where door staff are tapping. */
export function CheckInMenu({ arrived }: { arrived: number }): JSX.Element {
  function handleClearAll(): void {
    // Close the menu (DaisyUI dropdowns stay open while focused).
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (window.confirm("Clear every check-in for this event? (You can undo this.)")) {
      resetCheckIns();
    }
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-sm btn-square"
        aria-label="More check-in actions"
      >
        ⋯
      </button>
      <ul className="dropdown-content menu z-20 w-52 rounded-box border border-base-300 bg-base-100 p-1 text-sm shadow-lg">
        <li className={arrived === 0 ? "menu-disabled" : ""}>
          <button
            type="button"
            className="text-error-strong"
            disabled={arrived === 0}
            onClick={handleClearAll}
          >
            Clear all check-ins
          </button>
        </li>
      </ul>
    </div>
  );
}
