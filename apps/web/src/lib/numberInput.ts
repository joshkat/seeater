/** Rules for a number field that may be blank while you type. */
export interface NumberRules {
  min: number;
  max?: number;
  /** What a blank field means once committed. Defaults to `min`. */
  emptyValue?: number;
}

/** Keeps only digits, so the draft is always blank or a whole number. */
export function sanitizeNumberDraft(text: string): string {
  return text.replace(/\D/g, "");
}

/** Clamps a number into the field's range and rounds it. */
export function clampNumber(value: number, { min, max }: NumberRules): number {
  const rounded = Math.round(value);
  return Math.max(min, max === undefined ? rounded : Math.min(max, rounded));
}

/** The value a draft stands for: blank → `emptyValue` (or `min`), otherwise clamped. */
export function commitNumberDraft(draft: string, rules: NumberRules): number {
  const trimmed = draft.trim();
  if (trimmed === "") return clampNumber(rules.emptyValue ?? rules.min, rules);
  const parsed = Number(trimmed);
  return Number.isFinite(parsed)
    ? clampNumber(parsed, rules)
    : clampNumber(rules.emptyValue ?? rules.min, rules);
}
