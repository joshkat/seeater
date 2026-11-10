import { create } from "zustand";

import { type GuestFilter, NO_FILTER } from "../lib/guestFilter";
import type { GuestTab } from "../lib/guestTabs";

/** The guest list's current tab, search and filters (view state, not saved). */
interface GuestFilterState {
  /** To seat / Seated / All. */
  tab: GuestTab;
  filter: GuestFilter;
  setTab: (tab: GuestTab) => void;
  setFilter: (patch: Partial<GuestFilter>) => void;
  clearFilter: () => void;
}

export const useGuestFilterStore = create<GuestFilterState>((set) => ({
  tab: "toSeat",
  filter: NO_FILTER,
  setTab(tab) {
    set({ tab });
  },
  setFilter(patch) {
    set((state) => ({ filter: { ...state.filter, ...patch } }));
  },
  clearFilter() {
    set({ filter: NO_FILTER });
  },
}));
