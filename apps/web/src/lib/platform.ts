/** True on Apple platforms, where shortcuts use ⌘ instead of Ctrl. */
export function isApplePlatform(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

/** How to write a shortcut for this platform, e.g. "⌘Z" or "Ctrl+Z". */
export function shortcutLabel(key: string, { shift = false } = {}): string {
  return isApplePlatform() ? `${shift ? "⇧" : ""}⌘${key}` : `Ctrl+${shift ? "Shift+" : ""}${key}`;
}
