import { type KeyboardEvent, useState } from "react";

import {
  type NumberRules,
  clampNumber,
  commitNumberDraft,
  sanitizeNumberDraft,
} from "../lib/numberInput";

interface NumberFieldProps extends NumberRules {
  value: number;
  /** Called with the committed value: on blur, Enter, the arrow keys or −/+. */
  onChange: (value: number) => void;
  /** Amount for −/+ and the arrow keys. */
  step?: number;
  size?: "xs" | "sm";
  id?: string;
  "aria-label"?: string;
  /** Classes for the outer `join` (e.g. width). */
  className?: string;
}

const SIZE = {
  xs: { input: "input-xs", button: "btn-xs" },
  sm: { input: "input-sm", button: "btn-sm" },
} as const;

/**
 * A whole-number field with −/+ buttons. It can be blank while you type and
 * only commits on blur or Enter (blank → `emptyValue`, default `min`), so
 * replacing "1" with "2" works and intermediate values (typing "12" passes
 * through "1") never reach the document. A text input rather than
 * type="number" avoids browser spinners (which overlap the value in Firefox).
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  emptyValue,
  step = 1,
  size = "sm",
  id,
  "aria-label": ariaLabel,
  className = "",
}: NumberFieldProps): JSX.Element {
  const rules: NumberRules = { min, max, emptyValue };
  // null = not editing: show the real value.
  const [draft, setDraft] = useState<string | null>(null);
  const classes = SIZE[size];

  const commit = (next: number): void => {
    const clamped = clampNumber(next, rules);
    if (clamped !== value) onChange(clamped);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      commit(commitNumberDraft(draft ?? String(value), rules));
      setDraft(null);
    } else if (event.key === "Escape") {
      setDraft(null);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const base = commitNumberDraft(draft ?? String(value), rules);
      const next = clampNumber(base + (event.key === "ArrowUp" ? step : -step), rules);
      commit(next);
      setDraft(String(next));
    }
  };

  return (
    <div className={`join ${className}`}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Decrease"
        disabled={value <= min}
        className={`btn join-item ${classes.button} px-2`}
        onClick={() => commit(value - step)}
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={ariaLabel}
        className={`input join-item ${classes.input} w-full min-w-0 text-center text-base-content`}
        value={draft ?? String(value)}
        onFocus={(event) => {
          setDraft(String(value));
          event.target.select();
        }}
        onChange={(event) => setDraft(sanitizeNumberDraft(event.target.value))}
        onBlur={() => {
          if (draft !== null) commit(commitNumberDraft(draft, rules));
          setDraft(null);
        }}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Increase"
        disabled={max !== undefined && value >= max}
        className={`btn join-item ${classes.button} px-2`}
        onClick={() => commit(value + step)}
      >
        +
      </button>
    </div>
  );
}
