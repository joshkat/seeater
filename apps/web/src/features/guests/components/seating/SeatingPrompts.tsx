import { useSeatingFlowStore } from "../../store/seatingFlowStore";
import { HouseholdPrompt } from "./HouseholdPrompt";
import { OverflowPrompt } from "./OverflowPrompt";
import { SeatingNoticeToast } from "./SeatingNoticeToast";

/** Bottom-of-canvas slot for the seating flow's prompts (one at a time). */
export function SeatingPrompts(): JSX.Element {
  const question = useSeatingFlowStore((state) => state.question);
  const overflow = useSeatingFlowStore((state) => state.overflow);
  const notice = useSeatingFlowStore((state) => state.notice);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
      {question ? (
        <HouseholdPrompt question={question} />
      ) : overflow ? (
        <OverflowPrompt overflow={overflow} />
      ) : notice ? (
        <SeatingNoticeToast notice={notice} />
      ) : null}
    </div>
  );
}
