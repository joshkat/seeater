import { create } from "zustand";

import { type GuestFilter, NO_FILTER } from "../lib/guestFilter";

/** The guest list's current search and filters (view state, not saved). */
interface GuestFilterState {
  filter: GuestFilter;
  setFilter: (patch: Partial<GuestFilter>) => void;
  clearFilter: () => void;
}

export const useGuestFilterStore = create<GuestFilterState>((set) => ({
  filter: NO_FILTER,
  setFilter(patch) {
    set((state) => ({ filter: { ...state.filter, ...patch } }));
  },
  clearFilter() {
    set({ filter: NO_FILTER });
  },
}));
