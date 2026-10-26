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

/** Below Tailwind's `sm` breakpoint: phone layout (compact header and toolbar). */
export const PHONE_QUERY = "(max-width: 639px)";

/** Touch screens (no hover, finger-sized targets): no keyboard to assume. */
export const COARSE_POINTER_QUERY = "(pointer: coarse)";
