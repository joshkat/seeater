import { liveQuery } from "dexie";

import { useIdentityStore } from "../../auth/store/identityStore";
import { flushDocumentWrites, useDocumentStore } from "../../editor/store/documentStore";
import { LOCAL_SCOPE, type StorageScope } from "../../storage/db/scope";
import { adoptEvents } from "../../storage/repository/adoptEvents";
import { useStorageStore } from "../../storage/store/storageStore";
import { httpSyncApi } from "../api/syncApi";
import { useSyncStore } from "../store/syncStore";
import { createSyncScheduler } from "./syncScheduler";

/** Quiet period after the last local change before pushing it. */
const PUSH_DELAY_MS = 1500;
/** How often to check for changes made on other devices while the tab is visible. */
const POLL_INTERVAL_MS = 60_000;

function scopeFor(userId: string | null): StorageScope {
  return userId ? { kind: "account", userId } : LOCAL_SCOPE;
}

/**
 * If the open editor's event was rewritten by sync, show the new version. If
 * it moved to a new id, record that so the open page follows it
 * (`useFollowMovedEvent`).
 */
function reloadIfOpen(id: string, replacedBy?: string): void {
  if (replacedBy) {
    useSyncStore.getState().recordMove(id, replacedBy);
    return;
  }
  const { doc, reload } = useDocumentStore.getState();
  if (doc?.id === id) void reload();
}

const scheduler = createSyncScheduler(httpSyncApi, reloadIfOpen);

let unwatchDirty: (() => void) | null = null;

/** Sync soon whenever the active database has unsynced changes. */
function watchForDirtyRecords(): void {
  unwatchDirty?.();
  const db = useStorageStore.getState().db;
  const subscription = liveQuery(() =>
    db.events.filter((record) => record.sync.dirty).count(),
  ).subscribe({
    next: (dirtyCount) => {
      if (dirtyCount > 0) scheduler.request(PUSH_DELAY_MS);
    },
  });
  unwatchDirty = () => subscription.unsubscribe();
}

/**
 * Points local storage and sync at `userId`. Switching databases first flushes
 * pending editor saves; signing in from signed-out also moves the signed-out
 * events into the account so they start syncing.
 */
async function applyIdentity(userId: string | null): Promise<void> {
  const scope = scopeFor(userId);
  scheduler.setEnabled(false);
  await flushDocumentWrites();

  const previous = useStorageStore.getState().activate(scope);
  const current = useStorageStore.getState().db;
  if (previous !== current) {
    if (previous.name === "seating-local" && scope.kind === "account") {
      const moved = await adoptEvents(previous, current);
      if (moved > 0) {
        useSyncStore.setState({
          notice: `Moved ${moved} event${moved === 1 ? "" : "s"} from this device into your account.`,
        });
      }
    }
    // The previous database is left open rather than closed: live queries
    // may still be subscribed to it until React re-renders.
    await useDocumentStore.getState().reload();
  }

  watchForDirtyRecords();
  if (scope.kind === "account") {
    scheduler.setEnabled(true);
    scheduler.request();
  }
}

/** Identity changes are applied strictly one after another. */
let identityQueue: Promise<void> = Promise.resolve();
function queueIdentity(userId: string | null): void {
  identityQueue = identityQueue
    .then(() => applyIdentity(userId))
    .catch((error: unknown) => {
      console.error("Failed to switch local storage scope", error);
    });
}

/**
 * Wires identity → local database → sync for the app's lifetime. Called once
 * from main.tsx, before the first render, so the right database is active
 * from the start (including offline, using the last known account).
 */
export function startAccountSession(): void {
  const initial = useIdentityStore.getState().userId;
  useStorageStore.getState().activate(scopeFor(initial));
  queueIdentity(initial);

  useIdentityStore.subscribe((state, prev) => {
    if (state.userId !== prev.userId) queueIdentity(state.userId);
  });

  const syncSoon = (): void => scheduler.request();
  window.addEventListener("online", syncSoon);
  window.addEventListener("focus", syncSoon);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncSoon();
  });
  setInterval(() => {
    if (document.visibilityState === "visible") syncSoon();
  }, POLL_INTERVAL_MS);
}
