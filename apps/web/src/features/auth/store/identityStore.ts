import { create } from "zustand";

import { clerkPublishableKey, devSyncOwner } from "../lib/authConfig";

/** Remembers the last signed-in account so the app opens that account's local
 * data immediately — including offline, before (or without) Clerk loading. */
const LAST_USER_KEY = "seating.lastUserId";

function readLastUser(): string | null {
  try {
    return localStorage.getItem(LAST_USER_KEY);
  } catch {
    return null;
  }
}

function writeLastUser(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(LAST_USER_KEY, userId);
    else localStorage.removeItem(LAST_USER_KEY);
  } catch {
    /* storage unavailable — we'll just wait for Clerk next time */
  }
}

function initialUserId(): string | null {
  if (devSyncOwner) return devSyncOwner;
  if (clerkPublishableKey) return readLastUser();
  return null;
}

interface IdentityState {
  /** Who the local data and sync belong to; null = signed out (local only). */
  userId: string | null;
  setUserId: (userId: string | null) => void;
}

/**
 * The current identity, independent of Clerk's React tree so storage and sync
 * code can read and subscribe to it. Fed by ClerkIdentityBridge.
 */
export const useIdentityStore = create<IdentityState>((set, get) => ({
  userId: initialUserId(),

  setUserId(userId) {
    if (get().userId === userId) return;
    writeLastUser(userId);
    set({ userId });
  },
}));
