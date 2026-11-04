import { useEffect } from "react";
import { useNavigate } from "react-router";

import { useSyncStore } from "../store/syncStore";

/**
 * When sync re-creates the open event under a new id (your own copy of a
 * shared event you lost access to, or a clashing id), moves the page to it.
 * `pathFor` builds the same page's URL for the new id.
 */
export function useFollowMovedEvent(
  eventId: string | undefined,
  pathFor: (id: string) => string,
): void {
  const movedTo = useSyncStore((state) => (eventId ? state.movedEvents[eventId] : undefined));
  const navigate = useNavigate();

  useEffect(() => {
    if (movedTo) void navigate(pathFor(movedTo), { replace: true });
  }, [movedTo, navigate, pathFor]);
}
