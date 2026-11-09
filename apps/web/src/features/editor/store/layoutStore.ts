import { create } from "zustand";

import { DRAWER_QUERY, matchesQuery } from "../../../lib/useMediaQuery";

/**
 * Which side panels are open below the `xl` breakpoint (see usePanelMode). At
 * desktop widths both panels are always shown and these flags are ignored.
 *
 * - Drawers (tablets, phones): `guestsOpen` / `propertiesOpen`, one at a time.
 * - Docked (laptop windows): Guests follows `guestsDocked` (open until
 *   closed), Properties follows `propertiesOpen`; both can be open together.
 */
interface LayoutState {
  guestsOpen: boolean;
  propertiesOpen: boolean;
  /** Docked layout only: the guest panel is shown beside the floor plan. */
  guestsDocked: boolean;
  setGuestsDocked: (open: boolean) => void;
  setGuestsOpen: (open: boolean) => void;
  setPropertiesOpen: (open: boolean) => void;
  closeDrawers: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  guestsOpen: false,
  propertiesOpen: false,
  guestsDocked: true,
  setGuestsDocked(open) {
    set({ guestsDocked: open });
  },
  // Only one drawer at a time: they'd cover most of a tablet screen together.
  setGuestsOpen(open) {
    set((state) => ({ guestsOpen: open, propertiesOpen: open ? false : state.propertiesOpen }));
  },
  setPropertiesOpen(open) {
    set((state) => ({ propertiesOpen: open, guestsOpen: open ? false : state.guestsOpen }));
  },
  // Drawers cover the floor plan, so "show on map", Escape and the backdrop
  // close them. Docked panels cover nothing and stay as they are.
  closeDrawers() {
    if (typeof window !== "undefined" && !!window.matchMedia && !matchesQuery(DRAWER_QUERY)) {
      return;
    }
    set({ guestsOpen: false, propertiesOpen: false });
  },
}));
