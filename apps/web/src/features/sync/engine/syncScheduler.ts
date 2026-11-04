import { ApiError } from "../../../lib/apiClient";
import { activeDb } from "../../storage/store/storageStore";
import type { SyncApi } from "../api/syncApi";
import { useSyncStore } from "../store/syncStore";
import { type LocalChangeListener, runSync } from "./runSync";

/**
 * Runs sync passes one at a time. Requests made while a pass is running are
 * folded into a single follow-up pass; requests within `delayMs` of each other
 * are debounced. Never throws — outcomes are reported through syncStore.
 */
export interface SyncScheduler {
  request: (delayMs?: number) => void;
  setEnabled: (enabled: boolean) => void;
}

/** Tells the user where their edits to a no-longer-shared event went. */
export function keptCopiesNotice(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) {
    return `You can't edit a shared event any more, so your unsynced changes were saved as "${names[0]}".`;
  }
  return `You can't edit ${names.length} shared events any more, so your unsynced changes were saved as copies.`;
}

export function createSyncScheduler(
  api: SyncApi,
  onLocalChange: LocalChangeListener,
): SyncScheduler {
  let enabled = false;
  let running = false;
  let rerun = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function pass(): Promise<void> {
    if (!enabled) return;
    if (running) {
      rerun = true;
      return;
    }
    if (!navigator.onLine) {
      useSyncStore.setState({ status: "offline" });
      return;
    }

    running = true;
    useSyncStore.setState({ status: "syncing" });
    // Capture the database for this pass: if the scope switches mid-pass, we
    // keep writing to the database we planned against.
    const db = activeDb();
    try {
      const report = await runSync(db, api, onLocalChange);
      useSyncStore.setState({
        status: "idle",
        lastSyncedAt: new Date().toISOString(),
        lastError: null,
      });
      const notice = keptCopiesNotice(report.keptCopies);
      if (notice) useSyncStore.setState({ notice });
    } catch (error) {
      if (error instanceof ApiError) {
        const message =
          error.status === 401 ? "Your session expired — sign in again to sync." : error.message;
        useSyncStore.setState({ status: "error", lastError: message });
      } else {
        // fetch() rejects with a TypeError when the server is unreachable.
        useSyncStore.setState({ status: "offline", lastError: String(error) });
      }
    } finally {
      running = false;
    }

    if (rerun && enabled) {
      rerun = false;
      void pass();
    }
  }

  return {
    request(delayMs = 0) {
      if (!enabled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void pass();
      }, delayMs);
    },

    setEnabled(next) {
      enabled = next;
      if (!next) {
        if (timer) clearTimeout(timer);
        timer = null;
        rerun = false;
        useSyncStore.setState({ status: "disabled", lastError: null });
      }
    },
  };
}
