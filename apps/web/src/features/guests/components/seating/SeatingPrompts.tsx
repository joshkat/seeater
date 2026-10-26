import { useEffect } from "react";

import { useLayoutStore } from "../../../editor/store/layoutStore";
import { useSeatingFlowStore } from "../../store/seatingFlowStore";
import { HouseholdPrompt } from "./HouseholdPrompt";
import { OverflowPrompt } from "./OverflowPrompt";
import { SeatingNoticeToast } from "./SeatingNoticeToast";
import { SwapPrompt } from "./SwapPrompt";

/** Bottom-of-canvas slot for the seating flow's prompts (one at a time). */
export function SeatingPrompts(): JSX.Element {
  const question = useSeatingFlowStore((state) => state.question);
  const swap = useSeatingFlowStore((state) => state.swap);
  const overflow = useSeatingFlowStore((state) => state.overflow);
  const notice = useSeatingFlowStore((state) => state.notice);

  // On tablets an open drawer (and its backdrop) would cover the prompt and
  // the tables it's asking about, so a question or overflow closes them.
  const prompting = question !== null || swap !== null || overflow !== null;
  useEffect(() => {
    if (prompting) useLayoutStore.getState().closeDrawers();
  }, [prompting]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
      {question ? (
        <HouseholdPrompt question={question} />
      ) : swap ? (
        <SwapPrompt question={swap} />
      ) : overflow ? (
        <OverflowPrompt overflow={overflow} />
      ) : notice ? (
        <SeatingNoticeToast notice={notice} />
      ) : null}
    </div>
  );
}
