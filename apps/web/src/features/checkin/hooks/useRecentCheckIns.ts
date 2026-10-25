import { useCallback, useEffect, useRef, useState } from "react";

/** How long a just-checked-in row stays in place before it leaves "Not arrived". */
export const RECENT_CHECK_IN_MS = 5000;

/**
 * Guests checked in a moment ago. Their rows stay put (in a success state,
 * with Undo) for a few seconds instead of vanishing, so a mis-tap at a busy
 * door is easy to spot and fix.
 */
export function useRecentCheckIns(): {
  recentIds: ReadonlySet<string>;
  markRecent: (guestIds: string[]) => void;
  forget: (guestId: string) => void;
} {
  const [recentIds, setRecentIds] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const forget = useCallback((guestId: string) => {
    clearTimeout(timers.current.get(guestId));
    timers.current.delete(guestId);
    setRecentIds((current) => {
      if (!current.has(guestId)) return current;
      const next = new Set(current);
      next.delete(guestId);
      return next;
    });
  }, []);

  const markRecent = useCallback(
    (guestIds: string[]) => {
      for (const id of guestIds) {
        clearTimeout(timers.current.get(id));
        timers.current.set(
          id,
          setTimeout(() => forget(id), RECENT_CHECK_IN_MS),
        );
      }
      setRecentIds((current) => new Set([...current, ...guestIds]));
    },
    [forget],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  return { recentIds, markRecent, forget };
}
