import type { LayoutView } from "./layoutOps.js";
import { layoutViews } from "./layoutOps.js";
import { newId } from "./ids.js";
import { type EventDoc, MAX_GUESTS_PER_RULE, MAX_RULES, type SeatingRule } from "./schema.js";

/**
 * Seating rules: "keep together" / "keep apart" between guests, checked in
 * every layout. They only warn (and guide auto-seat); nothing is blocked.
 */

/** Adds a rule for some guests (unknown ids dropped; needs two). */
export function addRule(
  doc: EventDoc,
  kind: SeatingRule["kind"],
  guestIds: string[],
): { doc: EventDoc; ruleId: string | null } {
  const known = new Set(doc.guests.map((guest) => guest.id));
  const ids = [...new Set(guestIds)].filter((id) => known.has(id)).slice(0, MAX_GUESTS_PER_RULE);
  if (ids.length < 2 || doc.rules.length >= MAX_RULES) return { doc, ruleId: null };
  const rule: SeatingRule = { id: newId(), kind, guestIds: ids };
  return { doc: { ...doc, rules: [...doc.rules, rule] }, ruleId: rule.id };
}

export function removeRule(doc: EventDoc, ruleId: string): EventDoc {
  if (!doc.rules.some((rule) => rule.id === ruleId)) return doc;
  return { ...doc, rules: doc.rules.filter((rule) => rule.id !== ruleId) };
}

/** Takes deleted guests out of rules; rules left with fewer than two go. */
export function dropGuestsFromRules(doc: EventDoc, guestIds: string[]): EventDoc {
  const gone = new Set(guestIds);
  if (!doc.rules.some((rule) => rule.guestIds.some((id) => gone.has(id)))) return doc;
  const rules = doc.rules
    .map((rule) => ({ ...rule, guestIds: rule.guestIds.filter((id) => !gone.has(id)) }))
    .filter((rule) => rule.guestIds.length >= 2);
  return { ...doc, rules };
}

export interface RuleProblem {
  ruleId: string;
  kind: SeatingRule["kind"];
  /** Guests involved in this problem. */
  guestIds: string[];
  /** Tables involved (where the apart guests share, or where the together guests are split). */
  tableIds: string[];
}

/** Rule problems in one layout (default: the active one). */
export function ruleProblems(doc: EventDoc, view?: LayoutView): RuleProblem[] {
  const layout = view ?? layoutViews(doc).find((candidate) => candidate.active)!;
  const seatTable = new Map<string, string>();
  for (const table of layout.tables)
    for (const seat of table.seats) seatTable.set(seat.id, table.id);
  const tableOf = (guestId: string): string | undefined => {
    const seatId = layout.seating.get(guestId);
    return seatId ? seatTable.get(seatId) : undefined;
  };

  const problems: RuleProblem[] = [];
  for (const rule of doc.rules) {
    const byTable = new Map<string, string[]>();
    for (const guestId of rule.guestIds) {
      const tableId = tableOf(guestId);
      if (tableId) byTable.set(tableId, [...(byTable.get(tableId) ?? []), guestId]);
    }
    if (rule.kind === "together" && byTable.size > 1) {
      problems.push({
        ruleId: rule.id,
        kind: rule.kind,
        guestIds: [...byTable.values()].flat(),
        tableIds: [...byTable.keys()],
      });
    }
    if (rule.kind === "apart") {
      for (const [tableId, together] of byTable) {
        if (together.length > 1) {
          problems.push({
            ruleId: rule.id,
            kind: rule.kind,
            guestIds: together,
            tableIds: [tableId],
          });
        }
      }
    }
  }
  return problems;
}

/** Pairs of guests who are both to be kept together and apart (a contradiction). */
export function contradictoryPairs(doc: EventDoc): [string, string][] {
  const key = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const together = new Set<string>();
  for (const rule of doc.rules.filter((r) => r.kind === "together")) {
    for (const a of rule.guestIds)
      for (const b of rule.guestIds) if (a < b) together.add(key(a, b));
  }
  const found = new Set<string>();
  for (const rule of doc.rules.filter((r) => r.kind === "apart")) {
    for (const a of rule.guestIds)
      for (const b of rule.guestIds) if (a < b && together.has(key(a, b))) found.add(key(a, b));
  }
  return [...found].map((pair) => pair.split("|") as [string, string]);
}

/** Problems new in `after` compared to `before` (by rule and guests), for warnings after a move. */
export function newRuleProblems(before: EventDoc, after: EventDoc): RuleProblem[] {
  const seen = new Set(
    ruleProblems(before).map((p) => `${p.ruleId}:${[...p.guestIds].sort().join(",")}`),
  );
  return ruleProblems(after).filter(
    (p) => !seen.has(`${p.ruleId}:${[...p.guestIds].sort().join(",")}`),
  );
}
