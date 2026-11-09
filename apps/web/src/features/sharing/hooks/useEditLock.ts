import type { LockHolder, LockResponse } from "@seating/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { useIdentityStore } from "../../auth/store/identityStore";
import { requestSync } from "../../sync/engine/accountSession";
import { sharingApi } from "../api/sharingApi";
import { LOCK_POLL_MS, LOCK_RENEW_MS, needsEditLock } from "../lib/editLockPolicy";
import { TAB_ID } from "../lib/tabId";
import { useEventAccess } from "./useEventAccess";

/**
 * - `checking`: asking the server who's editing
 * - `free`: no lock needed (not shared, signed out, offline): edit away
 * - `held`: this tab is the editor
 * - `blocked`: someone else is editing; show the event read-only
 * - `lost`: someone took over while this tab was editing
 */
export type EditLockState =
  | { kind: "checking" }
  | { kind: "free" }
  | { kind: "held" }
  | { kind: "blocked"; holder: LockHolder }
  | { kind: "lost"; holder: LockHolder };

export interface EditLock {
  state: EditLockState;
  /** Take over from whoever is editing ("Edit anyway"). */
  editAnyway: () => void;
}

function toState(response: LockResponse, previous: EditLockState): EditLockState {
  if (response.held) return { kind: "held" };
  const wasEditing = previous.kind === "held" || previous.kind === "lost";
  return { kind: wasEditing ? "lost" : "blocked", holder: response.holder };
}

/**
 * "One editor at a time" for a shared event: takes the server's advisory lock
 * while the editor is open, renews it, and lets go on close. When someone
 * else holds it, reports who, keeps checking (and syncing, so the read-only
 * view stays fresh) and takes it as soon as they're done. Network failures
 * mean "edit locally": the lock only steers the UI, writes are still
 * compare-and-swap, so a clash falls back to a conflicted copy.
 */
export function useEditLock(eventId: string | undefined): EditLock {
  const signedIn = useIdentityStore((state) => state.userId !== null);
  const access = useEventAccess(eventId);
  const loaded = access !== undefined;
  const required = needsEditLock(access, signedIn);
  const [state, setState] = useState<EditLockState>({ kind: "checking" });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const acquire = useCallback(
    (force: boolean): Promise<void> => {
      if (!eventId) return Promise.resolve();
      return sharingApi.acquireLock(eventId, TAB_ID, force).then(
        (response) => setState((previous) => toState(response, previous)),
        // Offline or refused (e.g. just made a viewer, which the next sync
        // reflects): don't block local editing on it.
        () => setState((previous) => (previous.kind === "checking" ? { kind: "free" } : previous)),
      );
    },
    [eventId],
  );

  // Take the lock when it's needed; let it go when leaving.
  useEffect(() => {
    if (!eventId || !required) return;
    void acquire(false);
    const release = (): void => {
      if (stateRef.current.kind === "held") {
        void sharingApi.releaseLock(eventId, TAB_ID).catch(() => undefined);
      }
    };
    window.addEventListener("pagehide", release);
    return () => {
      window.removeEventListener("pagehide", release);
      release();
    };
  }, [eventId, required, acquire]);

  // Holding: renew. Blocked: check back, and pull their changes.
  useEffect(() => {
    if (!required) return;
    const kind = state.kind;
    if (kind !== "held" && kind !== "blocked") return;
    const tick = (): void => {
      // The editor keeps renewing in a background tab (browsers throttle
      // timers there to about once a minute, inside the lock's lifetime), so
      // switching tabs doesn't hand the event to someone else.
      if (kind === "blocked") {
        if (document.visibilityState !== "visible") return;
        requestSync();
      }
      void acquire(false);
    };
    const timer = setInterval(tick, kind === "held" ? LOCK_RENEW_MS : LOCK_POLL_MS);
    const onVisible = (): void => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [required, state.kind, acquire]);

  const current: EditLockState = required
    ? state
    : loaded || !eventId
      ? { kind: "free" }
      : { kind: "checking" };
  return { state: current, editAnyway: () => void acquire(true) };
}
