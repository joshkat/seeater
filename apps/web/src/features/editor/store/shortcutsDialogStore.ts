import { create } from "zustand";

/** Whether the keyboard-shortcuts cheat sheet is open. */
interface ShortcutsDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useShortcutsDialogStore = create<ShortcutsDialogState>((set) => ({
  open: false,
  setOpen(open) {
    set({ open });
  },
}));
