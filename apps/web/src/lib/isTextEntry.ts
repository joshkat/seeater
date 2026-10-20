/** Input types where the keyboard edits text (so Backspace, ⌘Z etc. belong to the field). */
const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "number", "tel", "url", "password"]);

/**
 * Whether a key event target is a place the user is typing. Global shortcuts
 * skip these, but not checkboxes, toggles or buttons — after ticking a box,
 * ⌘Z should still undo.
 */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA") return true;
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
}
