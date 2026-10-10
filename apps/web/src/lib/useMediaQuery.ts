import { useSyncExternalStore } from "react";

/** Whether a CSS media query currently matches (live). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `xl` breakpoint: side panels are fixed above it, drawers below. */
export const DESKTOP_QUERY = "(min-width: 1280px)";
