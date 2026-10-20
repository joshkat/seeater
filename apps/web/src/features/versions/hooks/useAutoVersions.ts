import type { EventDoc } from "@seating/shared";
import { useEffect } from "react";

import { useDocumentStore } from "../../editor/store/documentStore";
import { saveVersion } from "../../storage/repository/versionRepository";
import { activeDb } from "../../storage/store/storageStore";

/** How often an open event is snapshotted while it's being edited. */
export const AUTO_VERSION_INTERVAL_MS = 10 * 60 * 1000;

function save(doc: EventDoc, label: string): void {
  void saveVersion(activeDb(), doc, { kind: "auto", label }).catch((error) =>
    console.error("Couldn't save a version", error),
  );
}

/**
 * Automatic versions for the open event: one when it's opened (the state
 * before this session's edits) and one every 10 minutes while anything has
 * changed. Unchanged content is never saved twice (see saveVersion).
 */
export function useAutoVersions(): void {
  const docId = useDocumentStore((state) => state.doc?.id ?? null);

  useEffect(() => {
    const opened = useDocumentStore.getState().doc;
    if (!docId || !opened || opened.id !== docId) return;
    save(opened, "Opened");
    let lastSaved: EventDoc = opened;

    const timer = setInterval(() => {
      const doc = useDocumentStore.getState().doc;
      if (!doc || doc.id !== docId || doc === lastSaved) return;
      lastSaved = doc;
      save(doc, "Autosave");
    }, AUTO_VERSION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [docId]);
}
