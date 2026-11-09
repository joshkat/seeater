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

/** Tailwind's `xl` breakpoint: both side panels are always shown above it,
 * and the toolbar has its full set of buttons. */
export const DESKTOP_QUERY = "(min-width: 1280px)";

/**
 * Where the side panels are slide-over drawers: phones, small windows, and
 * tablets (touch) up to `xl`. A laptop-sized window with a mouse (900–1279px,
 * e.g. a 1440px screen zoomed to 125%) is neither this nor desktop: its panels
 * are docked beside the floor plan and can be closed (see usePanelMode).
 */
export const DRAWER_QUERY = "(max-width: 899.98px), (max-width: 1279.98px) and (pointer: coarse)";

/** Whether a media query matches right now (for code outside React). */
export function matchesQuery(query: string): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.(query).matches;
}

/** Below Tailwind's `sm` breakpoint: phone layout (compact header and toolbar). */
export const PHONE_QUERY = "(max-width: 639px)";

/** Touch screens (no hover, finger-sized targets): no keyboard to assume. */
export const COARSE_POINTER_QUERY = "(pointer: coarse)";
