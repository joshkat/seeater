import type { EventSummary } from "@seating/shared";
import { useLiveQuery } from "dexie-react-hooks";

import { listEventSummaries } from "../../storage/repository/eventRepository";
import { useStorageStore } from "../../storage/store/storageStore";

/**
 * Live list of events in the active local database. Re-renders whenever the
 * `events` store changes (edits, sync pulls, other tabs) or the storage scope
 * switches. `undefined` while the first query is running.
 */
export function useEventSummaries(): EventSummary[] | undefined {
  const db = useStorageStore((state) => state.db);
  return useLiveQuery(() => listEventSummaries(db), [db]);
}
