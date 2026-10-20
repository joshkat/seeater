import { create } from "zustand";

/** Whether the version history dialog is open (the keyboard shortcuts check it). */
interface VersionDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useVersionDialogStore = create<VersionDialogState>((set) => ({
  open: false,
  setOpen(open) {
    set({ open });
  },
}));
