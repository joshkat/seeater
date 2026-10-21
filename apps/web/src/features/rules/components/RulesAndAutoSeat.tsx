import { useState } from "react";

import { useRuleProblems } from "../hooks/useRuleProblems";
import { AutoSeatDialog } from "./AutoSeatDialog";
import { RulesDialog } from "./RulesDialog";

/** "Rules" (with a problem count) and "Auto-seat…" buttons for the guest panel. */
export function RulesAndAutoSeat(): JSX.Element {
  const { problems } = useRuleProblems();
  const [open, setOpen] = useState<"rules" | "auto" | null>(null);

  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost btn-xs ${problems.length > 0 ? "text-error" : ""}`}
        title="Keep-together and keep-apart rules"
        onClick={() => setOpen("rules")}
      >
        Rules{problems.length > 0 && ` ⚠${problems.length}`}
      </button>
      <button type="button" className="btn btn-ghost btn-xs" onClick={() => setOpen("auto")}>
        Auto-seat…
      </button>
      {open === "rules" && <RulesDialog onClose={() => setOpen(null)} />}
      {open === "auto" && <AutoSeatDialog onClose={() => setOpen(null)} />}
    </>
  );
}
