import { addRule } from "@seating/shared";

import { useDocumentStore } from "../../editor/store/documentStore";
import { useSeatingFlowStore } from "../store/seatingFlowStore";
import { useGuestStore } from "../store/guestStore";

/** "More ▾" for the selected guests: keep together / apart rules, swap two seats. */
export function SelectionMoreMenu(): JSX.Element {
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const doc = useDocumentStore((state) => state.doc);
  const apply = useDocumentStore((state) => state.apply);
  const count = selectedGuestIds.length;
  const seated = doc?.guests.filter((g) => selectedGuestIds.includes(g.id) && g.seatId).length ?? 0;
  const closeMenu = (): void => (document.activeElement as HTMLElement | null)?.blur();

  const rule = (kind: "together" | "apart"): void => {
    closeMenu();
    apply((current) => addRule(current, kind, selectedGuestIds).doc);
    useSeatingFlowStore
      .getState()
      .showNotice(
        kind === "together"
          ? `These ${count} guests will be kept together.`
          : `These ${count} guests will be kept apart.`,
      );
  };

  return (
    <div className="dropdown dropdown-end ml-auto">
      <button type="button" tabIndex={0} disabled={count === 0} className="btn btn-ghost btn-xs">
        More ▾
      </button>
      <ul className="dropdown-content menu z-30 mt-1 w-52 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        <li className={count < 2 ? "menu-disabled" : ""}>
          <button type="button" disabled={count < 2} onClick={() => rule("together")}>
            Keep together (rule)
          </button>
        </li>
        <li className={count < 2 ? "menu-disabled" : ""}>
          <button type="button" disabled={count < 2} onClick={() => rule("apart")}>
            Keep apart (rule)
          </button>
        </li>
        <li className={count !== 2 || seated === 0 ? "menu-disabled" : ""}>
          <button
            type="button"
            disabled={count !== 2 || seated === 0}
            title="Select exactly two guests (at least one seated)"
            onClick={() => {
              closeMenu();
              // Asks before splitting a household, then confirms with Undo.
              useSeatingFlowStore.getState().requestSwap(selectedGuestIds[0], selectedGuestIds[1]);
            }}
          >
            Swap their seats
          </button>
        </li>
      </ul>
    </div>
  );
}
