import type { MouseEvent } from "react";

/** Multi-select modifiers on a guest-list click. */
export interface SelectModifiers {
  /** ⌘/Ctrl held: toggle in or out of the selection. */
  additive: boolean;
  /** Shift held: select a range from the last clicked guest. */
  range: boolean;
}

/** Reads the multi-select modifiers off a click. */
export function selectModifiers(event: MouseEvent): SelectModifiers {
  return { additive: event.ctrlKey || event.metaKey, range: event.shiftKey };
}
