import { useRef } from "react";

import { BACKUP_EXTENSION } from "../lib/backupFile";
import { importEventBackup } from "../lib/backupActions";

/** What happened to the last backup import (shown by BackupImportNotice). */
export type BackupImportResult = { ok: true; name: string } | { ok: false };

/** Dashboard button that restores an event from a `.seating.json` backup. */
export function ImportBackupButton({
  onResult,
}: {
  onResult: (result: BackupImportResult) => void;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File): Promise<void> {
    try {
      const name = await importEventBackup(file);
      onResult({ ok: true, name });
    } catch (error) {
      // The reason ("Missing schemaVersion", …) is for developers; people get
      // plain words (BackupImportNotice).
      console.error("Backup import failed:", error);
      onResult({ ok: false });
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={`${BACKUP_EXTENSION},application/json`}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = ""; // allow importing the same file again
        }}
      />
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        title="Restore an event from a backup file"
        onClick={() => inputRef.current?.click()}
      >
        Import backup
      </button>
    </>
  );
}
