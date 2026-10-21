import { create } from "zustand";

/** Which guest's details dialog is open (the keyboard shortcuts check it). */
interface GuestDetailsState {
  guestId: string | null;
  open: (guestId: string) => void;
  close: () => void;
}

export const useGuestDetailsStore = create<GuestDetailsState>((set) => ({
  guestId: null,
  open(guestId) {
    set({ guestId });
  },
  close() {
    set({ guestId: null });
  },
}));
