import { useSyncExternalStore } from "react";

import { type ThemeValue, applyTheme, getSavedTheme } from "./theme";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Switches the theme (persisted) and updates every theme picker on screen. */
export function setTheme(theme: ThemeValue): void {
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

/** The current theme, live. */
export function useTheme(): ThemeValue {
  return useSyncExternalStore(subscribe, getSavedTheme, getSavedTheme);
}
