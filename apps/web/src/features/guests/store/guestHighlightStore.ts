import { create } from "zustand";

/** How long a new guest's row stays highlighted. */
const FLASH_MS = 2600;

/**
 * Guests just added (typed in or imported): the list scrolls to the first of
 * them and highlights their rows briefly, so it's obvious where they went.
 */
interface GuestHighlightState {
  guestIds: string[];
  /** Changes on every flash, so the same ids can flash twice. */
  token: number;
  flash: (guestIds: string[]) => void;
  clear: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useGuestHighlightStore = create<GuestHighlightState>((set, get) => ({
  guestIds: [],
  token: 0,
  flash(guestIds) {
    if (guestIds.length === 0) return;
    clearTimeout(timer);
    set({ guestIds, token: get().token + 1 });
    timer = setTimeout(() => set({ guestIds: [] }), FLASH_MS);
  },
  clear() {
    clearTimeout(timer);
    set({ guestIds: [] });
  },
}));
