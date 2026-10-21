import { type RuleProblem, ruleProblems } from "@seating/shared";
import { useMemo } from "react";

import { useDocumentStore } from "../../editor/store/documentStore";

/** Rule problems in the active layout, plus the guests and tables involved. */
export function useRuleProblems(): {
  problems: RuleProblem[];
  guestIds: Set<string>;
  tableIds: Set<string>;
} {
  const doc = useDocumentStore((state) => state.doc);
  return useMemo(() => {
    const problems = doc ? ruleProblems(doc) : [];
    return {
      problems,
      guestIds: new Set(problems.flatMap((problem) => problem.guestIds)),
      tableIds: new Set(problems.flatMap((problem) => problem.tableIds)),
    };
  }, [doc]);
}
