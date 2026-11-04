import { create } from "zustand";

/** Whether the Share dialog is open (keyboard shortcuts check it). */
interface ShareDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useShareDialogStore = create<ShareDialogState>((set) => ({
  open: false,
  setOpen(open) {
    set({ open });
  },
}));
