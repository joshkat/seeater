/** Closes a DaisyUI focus dropdown (it stays open while something inside has focus). */
export function blurActiveElement(): void {
  (document.activeElement as HTMLElement | null)?.blur();
}
