import { useMemo } from "react";

import { useGuests, useTables } from "../../../editor/hooks/useDocumentSelectors";
import { tableNameById } from "../../../editor/lib/tableLabel";
import { type HouseholdQuestion, useSeatingFlowStore } from "../../store/seatingFlowStore";

/** "Ada is in the Lovelace household — move all of them?" Asked before any
 * seating move that would split a household. */
export function HouseholdPrompt({ question }: { question: HouseholdQuestion }): JSX.Element {
  const guests = useGuests();
  const tables = useTables();
  const answerHousehold = useSeatingFlowStore((state) => state.answerHousehold);
  const dismiss = useSeatingFlowStore((state) => state.dismiss);

  const nameOf = useMemo(() => {
    const names = new Map(guests.map((guest) => [guest.id, guest.name]));
    return (id: string): string => names.get(id) ?? "Guest";
  }, [guests]);

  const { splits, guestIds, target } = question;
  const tableName = tableNameById(tables, target.tableId);
  const single = splits.length === 1 ? splits[0] : null;
  const wholeCount = splits.reduce(
    (sum, split) => sum + split.movingIds.length + split.leftBehindIds.length,
    0,
  );
  const onlyLabel = guestIds.length === 1 ? `Only ${nameOf(guestIds[0])}` : "Only those selected";

  return (
    <div
      role="dialog"
      aria-label="Keep household together?"
      className="card pointer-events-auto w-full max-w-md border border-base-300 bg-base-100 shadow-xl"
    >
      <div className="card-body gap-2 p-4 text-sm text-base-content">
        {single ? (
          <p>
            <strong>{single.movingIds.map(nameOf).join(", ")}</strong>{" "}
            {single.movingIds.length === 1 ? "is" : "are"} in the{" "}
            <strong>{single.household.name}</strong> household.{" "}
            {single.leftBehindIds.map(nameOf).join(", ")} would end up apart.
          </p>
        ) : (
          <p>
            This would split {splits.length} households:{" "}
            <strong>{splits.map((split) => split.household.name).join(", ")}</strong>.
          </p>
        )}
        <div className="card-actions mt-1 flex-wrap justify-end">
          <button type="button" className="btn btn-sm" onClick={dismiss}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => answerHousehold(false)}
          >
            {onlyLabel}
          </button>
          <button
            type="button"
            autoFocus
            className="btn btn-primary btn-sm"
            onClick={() => answerHousehold(true)}
          >
            Move {single ? "whole household" : "whole households"} ({wholeCount}) to {tableName}
          </button>
        </div>
      </div>
    </div>
  );
}
