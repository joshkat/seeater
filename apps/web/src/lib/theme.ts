/**
 * Theme persistence helpers. The active DaisyUI theme is stored as
 * `data-theme` on <html> and persisted to localStorage so it survives
 * page loads without a flash.
 */

const STORAGE_KEY = "seating.theme";
const DEFAULT_THEME = "seating";

/** Valid theme values that match the names registered in global.css + DaisyUI. */
export const THEMES = [
  { value: "seating", label: "Light" },
  { value: "seating-dark", label: "Dark" },
  { value: "black", label: "Black" },
  { value: "synthwave", label: "Purple" },
] as const;

export type ThemeValue = (typeof THEMES)[number]["value"];

/** Read the persisted theme (or the default). */
export function getSavedTheme(): ThemeValue {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.some((t) => t.value === stored)) return stored as ThemeValue;
  } catch {
    // localStorage may be unavailable in some environments.
  }
  return DEFAULT_THEME;
}

/** Apply a theme to <html data-theme> and persist it. */
export function applyTheme(theme: ThemeValue): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

/** Call once at startup (before React renders) to restore the saved theme
 * without a visible flash. */
export function restoreTheme(): void {
  applyTheme(getSavedTheme());
}
