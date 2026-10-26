import { useMemo } from "react";

import { useGuests } from "../../../editor/hooks/useDocumentSelectors";
import { type SwapQuestion, useSeatingFlowStore } from "../../store/seatingFlowStore";

/** "Marie Curie is in the Curie household. Pierre, Irène and Ève would end up
 * apart." Asked before "Swap their seats" splits a household, like every
 * other way of seating guests. */
export function SwapPrompt({ question }: { question: SwapQuestion }): JSX.Element {
  const guests = useGuests();
  const confirmSwap = useSeatingFlowStore((state) => state.confirmSwap);
  const dismiss = useSeatingFlowStore((state) => state.dismiss);

  const nameOf = useMemo(() => {
    const names = new Map(guests.map((guest) => [guest.id, guest.name]));
    return (id: string): string => names.get(id) ?? "Guest";
  }, [guests]);

  return (
    <div
      role="dialog"
      aria-label="Swap seats?"
      className="card pointer-events-auto w-full max-w-md border border-base-300 bg-base-100 shadow-xl"
    >
      <div className="card-body gap-2 p-4 text-sm text-base-content">
        {question.splits.map((split) => (
          <p key={split.household.id}>
            <strong>{split.movingIds.map(nameOf).join(" and ")}</strong>{" "}
            {split.movingIds.length === 1 ? "is" : "are"} in the{" "}
            <strong>{split.household.name}</strong> household.{" "}
            {split.leftBehindIds.map(nameOf).join(", ")} would end up apart.
          </p>
        ))}
        <div className="card-actions mt-1 justify-end">
          <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>
            Cancel
          </button>
          <button type="button" autoFocus className="btn btn-primary btn-sm" onClick={confirmSwap}>
            Swap anyway
          </button>
        </div>
      </div>
    </div>
  );
}
