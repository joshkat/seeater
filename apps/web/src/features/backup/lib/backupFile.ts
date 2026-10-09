import { type EventDoc, EventDocError, parseEventDoc } from "@seating/shared";

/**
 * Backup files: one event document wrapped in a small envelope, saved as
 * `<name>.seating.json`. They're the safety net for signed-out users (whose
 * only copy lives in this browser) and a way to move an event between
 * browsers or accounts by hand.
 */
export const BACKUP_FORMAT = "seating-event-backup";
export const BACKUP_EXTENSION = ".seating.json";

interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  event: EventDoc;
}

export function serializeBackup(doc: EventDoc, now = new Date().toISOString()): string {
  const envelope: BackupEnvelope = { format: BACKUP_FORMAT, exportedAt: now, event: doc };
  return JSON.stringify(envelope, null, 2);
}

/** A filesystem-friendly name like "sarah-tom-wedding.seating.json". */
export function backupFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "event"}${BACKUP_EXTENSION}`;
}

/**
 * Parses and validates a backup file's text. Accepts the envelope or a bare
 * event document. Throws EventDocError with a user-readable message.
 */
export function parseBackup(text: string): EventDoc {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new EventDocError("That file isn't valid JSON.");
  }
  const envelope = json as Partial<BackupEnvelope> | null;
  if (envelope && typeof envelope === "object" && "format" in envelope) {
    if (envelope.format !== BACKUP_FORMAT) {
      throw new EventDocError("That file isn't a seating chart backup.");
    }
    return parseEventDoc(envelope.event);
  }
  return parseEventDoc(json);
}
