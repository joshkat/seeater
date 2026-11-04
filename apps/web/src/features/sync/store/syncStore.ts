import { create } from "zustand";

/**
 * - disabled: signed out (or sync not configured) — data lives only on this device
 * - idle:     signed in and up to date as of `lastSyncedAt`
 * - syncing:  a sync pass is running
 * - offline:  signed in but the API is unreachable; changes are kept locally
 * - error:    the API rejected us (e.g. session expired) — see `lastError`
 */
export type SyncStatus = "disabled" | "idle" | "syncing" | "offline" | "error";

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  /** One-off message for the user (e.g. "moved 3 events into your account"). */
  notice: string | null;
  dismissNotice: () => void;
  /**
   * Events sync re-created under a new id (old id → new id), so a page that
   * has the old one open can follow it.
   */
  movedEvents: Record<string, string>;
  recordMove: (fromId: string, toId: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "disabled",
  lastSyncedAt: null,
  lastError: null,
  notice: null,
  dismissNotice: () => set({ notice: null }),
  movedEvents: {},
  recordMove: (fromId, toId) =>
    set((state) => ({ movedEvents: { ...state.movedEvents, [fromId]: toId } })),
}));
