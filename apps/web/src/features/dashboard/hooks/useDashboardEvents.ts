import { useLiveQuery } from "dexie-react-hooks";

import { type DashboardEvent, listDashboardEvents } from "../../storage/repository/eventRepository";
import { useStorageStore } from "../../storage/store/storageStore";

/**
 * Live list of the dashboard's events in the active local database, with
 * their sharing state. Re-renders whenever the `events` store changes (edits,
 * sync pulls, other tabs) or the storage scope switches. `undefined` while
 * the first query is running.
 */
export function useDashboardEvents(): DashboardEvent[] | undefined {
  const db = useStorageStore((state) => state.db);
  return useLiveQuery(() => listDashboardEvents(db), [db]);
}
