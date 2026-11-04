import type { EventRole } from "@seating/shared";
import { useLiveQuery } from "dexie-react-hooks";

import { recordRole } from "../../storage/db/SeatingDb";
import { useStorageStore } from "../../storage/store/storageStore";

export interface EventAccessState {
  role: EventRole;
  ownerName: string | null;
  memberCount: number;
  /** Whether the server has this event yet (it must, to be shared). */
  synced: boolean;
}

/** The signed-in user's access to a local event, live. `undefined` while loading. */
export function useEventAccess(eventId: string | null | undefined): EventAccessState | undefined {
  const db = useStorageStore((state) => state.db);
  return useLiveQuery(async () => {
    if (!eventId) return undefined;
    const record = await db.events.get(eventId);
    if (!record) return undefined;
    return {
      role: recordRole(record.sync),
      ownerName: record.sync.ownerName ?? null,
      memberCount: record.sync.memberCount ?? 0,
      synced: record.sync.baseVersion !== null,
    };
  }, [db, eventId]);
}
