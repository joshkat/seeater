import { useLiveQuery } from "dexie-react-hooks";

import type { EventVersionRecord } from "../../storage/db/SeatingDb";
import { listVersions } from "../../storage/repository/versionRepository";
import { useStorageStore } from "../../storage/store/storageStore";

/** Live list of an event's saved versions, newest first (undefined while loading). */
export function useVersions(eventId: string | null): EventVersionRecord[] | undefined {
  const db = useStorageStore((state) => state.db);
  return useLiveQuery(async () => (eventId ? listVersions(db, eventId) : []), [db, eventId]);
}
