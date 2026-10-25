import { addRule, swapSeats } from "@seating/shared";

import { useDocumentStore } from "../../editor/store/documentStore";
import { useSeatingFlowStore } from "../store/seatingFlowStore";
import { useGuestStore } from "../store/guestStore";

/** "More ▾" for the selected guests: keep together / apart rules, swap two
 * seats, take them out of their household. Opens upwards (it lives in the
 * bar docked to the bottom of the guest list). */
export function SelectionMoreMenu(): JSX.Element {
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const doc = useDocumentStore((state) => state.doc);
  const apply = useDocumentStore((state) => state.apply);
  const count = selectedGuestIds.length;
  const seated = doc?.guests.filter((g) => selectedGuestIds.includes(g.id) && g.seatId).length ?? 0;
  const inHousehold = doc?.guests.some(
    (g) => selectedGuestIds.includes(g.id) && g.householdId !== null,
  );
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
    <div className="dropdown dropdown-top dropdown-end">
      <button type="button" tabIndex={0} disabled={count === 0} className="btn btn-ghost btn-xs">
        More ▾
      </button>
      <ul className="dropdown-content menu z-30 mb-1 w-52 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
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
              apply((current) => swapSeats(current, selectedGuestIds[0], selectedGuestIds[1]));
              useGuestStore.getState().clearGuestSelection();
            }}
          >
            Swap their seats
          </button>
        </li>
        <li className={inHousehold ? "" : "menu-disabled"}>
          <button
            type="button"
            disabled={!inHousehold}
            title="Take the selected guests out of their household"
            onClick={() => {
              closeMenu();
              useGuestStore.getState().removeFromHousehold(selectedGuestIds);
            }}
          >
            Remove from household
          </button>
        </li>
      </ul>
    </div>
  );
}
