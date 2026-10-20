import { create } from "zustand";

/**
 * Which side panels are open when they're slide-over drawers (narrower than
 * the `xl` breakpoint, i.e. tablets). At desktop widths both panels are
 * always shown and these flags are ignored.
 */
interface LayoutState {
  guestsOpen: boolean;
  propertiesOpen: boolean;
  setGuestsOpen: (open: boolean) => void;
  setPropertiesOpen: (open: boolean) => void;
  closeDrawers: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  guestsOpen: false,
  propertiesOpen: false,
  // Only one drawer at a time: they'd cover most of a tablet screen together.
  setGuestsOpen(open) {
    set((state) => ({ guestsOpen: open, propertiesOpen: open ? false : state.propertiesOpen }));
  },
  setPropertiesOpen(open) {
    set((state) => ({ propertiesOpen: open, guestsOpen: open ? false : state.guestsOpen }));
  },
  closeDrawers() {
    set({ guestsOpen: false, propertiesOpen: false });
  },
}));
