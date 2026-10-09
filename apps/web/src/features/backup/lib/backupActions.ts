import { downloadTextFile } from "../../../lib/downloadFile";
import { getEventDoc, importEvent } from "../../storage/repository/eventRepository";
import { activeDb } from "../../storage/store/storageStore";
import { backupFileName, parseBackup, serializeBackup } from "./backupFile";

/** Downloads one event from the active database as a backup file. */
export async function downloadEventBackup(eventId: string): Promise<void> {
  const doc = await getEventDoc(activeDb(), eventId);
  if (!doc) throw new Error("Event not found");
  downloadTextFile(backupFileName(doc.name), serializeBackup(doc), "application/json");
}

/** Imports a backup file into the active database. Returns the event name. */
export async function importEventBackup(file: File): Promise<string> {
  const doc = parseBackup(await file.text());
  const imported = await importEvent(activeDb(), doc);
  return imported.name;
}
