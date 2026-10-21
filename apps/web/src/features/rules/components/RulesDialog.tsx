import { contradictoryPairs, removeRule } from "@seating/shared";
import { useEffect, useMemo } from "react";

import { useDocumentStore } from "../../editor/store/documentStore";
import { useRuleProblems } from "../hooks/useRuleProblems";
import { RuleRow } from "./RuleRow";

/** Every seating rule, whether it holds in this layout, and contradictions. */
export function RulesDialog({ onClose }: { onClose: () => void }): JSX.Element | null {
  const doc = useDocumentStore((state) => state.doc);
  const apply = useDocumentStore((state) => state.apply);
  const { problems } = useRuleProblems();
  const broken = useMemo(() => new Set(problems.map((problem) => problem.ruleId)), [problems]);
  const names = useMemo(() => new Map((doc?.guests ?? []).map((g) => [g.id, g.name])), [doc]);
  const contradictions = useMemo(() => (doc ? contradictoryPairs(doc) : []), [doc]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!doc) return null;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Seating rules">
      <div className="modal-box flex max-h-[85vh] max-w-xl flex-col gap-3 text-base-content">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Seating rules</h2>
            <p className="text-sm text-base-content/60">
              To add one, tick guests, then More ▾ → Keep together / Keep apart. Rules only warn —
              and Auto-seat follows them.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {contradictions.length > 0 && (
          <div role="alert" className="alert alert-error py-2 text-sm">
            {contradictions.map(([a, b]) => `${names.get(a)} & ${names.get(b)}`).join(", ")} are
            both kept together and kept apart.
          </div>
        )}
        <ul className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
          {doc.rules.length === 0 && (
            <li className="text-sm text-base-content/60">No rules yet.</li>
          )}
          {doc.rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              names={rule.guestIds.map((id) => names.get(id) ?? "?")}
              problem={broken.has(rule.id)}
              onDelete={() => apply((current) => removeRule(current, rule.id))}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
