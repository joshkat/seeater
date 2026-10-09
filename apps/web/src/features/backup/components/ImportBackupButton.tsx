import { useRef, useState } from "react";

import { BACKUP_EXTENSION } from "../lib/backupFile";
import { importEventBackup } from "../lib/backupActions";

/** Dashboard button that restores an event from a `.seating.json` backup. */
export function ImportBackupButton(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function handleFile(file: File): Promise<void> {
    try {
      const name = await importEventBackup(file);
      setMessage({ text: `Imported “${name}”.`, error: false });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Couldn't import that file.",
        error: true,
      });
    }
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span className={`text-xs ${message.error ? "text-error" : "text-base-content/60"}`}>
          {message.text}
        </span>
      )}
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
    </div>
  );
}
