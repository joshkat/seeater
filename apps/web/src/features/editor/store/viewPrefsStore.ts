import { create } from "zustand";

import type { ChairColorMode } from "../lib/chairColors";

const STORAGE_KEY = "seating.chairColorMode";

function savedMode(): ChairColorMode {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "tag" || value === "meal" || value === "rsvp" || value === "guest") return value;
  } catch {
    // Storage unavailable: use the default.
  }
  return "guest";
}

/** Per-user view preferences (remembered in this browser, not in the event). */
interface ViewPrefsState {
  chairColorMode: ChairColorMode;
  setChairColorMode: (mode: ChairColorMode) => void;
}

export const useViewPrefsStore = create<ViewPrefsState>((set) => ({
  chairColorMode: savedMode(),
  setChairColorMode(mode) {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Not remembered, but still applied.
    }
    set({ chairColorMode: mode });
  },
}));
