import type { EventAccessState } from "../hooks/useEventAccess";

/** How often the editing tab renews its lock (well inside EDIT_LOCK_TTL_MS). */
export const LOCK_RENEW_MS = 30_000;
/** How often a blocked tab checks whether the editor has finished. */
export const LOCK_POLL_MS = 10_000;

/**
 * Whether opening this event should take the edit lock: only events other
 * people can open too (shared with you, or that you've shared), once the
 * server knows them. Solo events, signed-out use and viewers skip it.
 */
export function needsEditLock(access: EventAccessState | undefined, signedIn: boolean): boolean {
  if (!signedIn || !access || !access.synced) return false;
  if (access.role === "viewer") return false;
  return access.role === "editor" || access.memberCount > 0;
}
