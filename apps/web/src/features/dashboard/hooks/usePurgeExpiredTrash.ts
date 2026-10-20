import { useEffect } from "react";

import { purgeExpiredTrash } from "../../storage/repository/eventRepository";
import { useStorageStore } from "../../storage/store/storageStore";

/** Deletes events that have been in the trash for over 30 days (on visit). */
export function usePurgeExpiredTrash(): void {
  const db = useStorageStore((state) => state.db);
  useEffect(() => {
    void purgeExpiredTrash(db).catch((error) => console.error("Trash purge failed", error));
  }, [db]);
}
