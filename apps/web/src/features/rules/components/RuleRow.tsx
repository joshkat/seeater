import type { SeatingRule } from "@seating/shared";

interface RuleRowProps {
  rule: SeatingRule;
  names: string[];
  problem: boolean;
  onDelete: () => void;
}

/** One rule: who, which kind, whether it's broken right now. */
export function RuleRow({ rule, names, problem, onDelete }: RuleRowProps): JSX.Element {
  return (
    <li className="flex items-center gap-2 rounded-box border border-base-300 p-2">
      <span
        className={`badge badge-sm ${rule.kind === "together" ? "badge-info" : "badge-warning"}`}
      >
        {rule.kind === "together" ? "Together" : "Apart"}
      </span>
      <span className="min-w-0 flex-1 text-sm">{names.join(", ")}</span>
      <span className={`text-xs ${problem ? "text-error-strong" : "text-success-strong"}`}>
        {problem ? "⚠ Broken" : "✓ OK"}
      </span>
      <button
        type="button"
        aria-label="Delete rule"
        className="btn btn-ghost btn-xs btn-square"
        onClick={onDelete}
      >
        ×
      </button>
    </li>
  );
}
