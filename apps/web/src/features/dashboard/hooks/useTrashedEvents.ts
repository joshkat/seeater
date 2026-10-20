import { useLiveQuery } from "dexie-react-hooks";

import { type TrashedEvent, listTrashedEvents } from "../../storage/repository/eventRepository";
import { useStorageStore } from "../../storage/store/storageStore";

/** Live list of events in the trash (undefined while loading). */
export function useTrashedEvents(): TrashedEvent[] | undefined {
  const db = useStorageStore((state) => state.db);
  return useLiveQuery(() => listTrashedEvents(db), [db]);
}
