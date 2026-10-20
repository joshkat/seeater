import {
  MAX_EVENT_NAME_LENGTH,
  parseEventDoc,
  reidentifyEventDoc,
  restoreEventDoc,
} from "@seating/shared";

import { shortcutLabel } from "../../../lib/platform";
import { useDocumentStore } from "../../editor/store/documentStore";
import { pruneStaleSelections } from "../../editor/store/historyActions";
import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import type { EventVersionRecord } from "../../storage/db/SeatingDb";
import { createEvent } from "../../storage/repository/eventRepository";
import { saveVersion } from "../../storage/repository/versionRepository";
import { activeDb } from "../../storage/store/storageStore";

/** Saves the open event as a named version. */
export async function saveNamedVersion(label: string): Promise<void> {
  const doc = useDocumentStore.getState().doc;
  if (doc) await saveVersion(activeDb(), doc, { kind: "named", label });
}

/**
 * Restores a version into the open event. The current state is saved as a
 * version first, and the restore is one edit, so ⌘Z (this session) or the
 * "Before restoring" version (any time) brings it back.
 */
export async function restoreVersion(version: EventVersionRecord): Promise<void> {
  const documents = useDocumentStore.getState();
  const current = documents.doc;
  if (!current || current.id !== version.eventId) return;
  // Versions may predate a schema change: upgrade + validate like a backup.
  const restored = parseEventDoc(version.doc);
  await saveVersion(activeDb(), current, {
    kind: "auto",
    label: `Before restoring “${version.label}”`,
  });
  documents.apply((doc) => restoreEventDoc(doc, restored));
  pruneStaleSelections();
  const flow = useSeatingFlowStore.getState();
  flow.dismiss();
  flow.showNotice(`Restored “${version.label}”. Undo with ${shortcutLabel("Z")}.`);
}

/** Copies a version into a brand-new event; returns its id (to open it). */
export async function copyVersionToNewEvent(version: EventVersionRecord): Promise<string> {
  const source = parseEventDoc(version.doc);
  const copy = reidentifyEventDoc(source);
  copy.name = `${source.name} (${version.label})`.slice(0, MAX_EVENT_NAME_LENGTH);
  await createEvent(activeDb(), copy);
  return copy.id;
}
