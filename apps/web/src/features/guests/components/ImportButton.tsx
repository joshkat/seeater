import { useRef, useState } from "react";

import { cleanRows } from "../lib/importMapping";
import { IMPORT_ACCEPT, readGuestFileRows } from "../lib/spreadsheet";
import { FormatHelp } from "./FormatHelp";
import { ImportGuestsDialog } from "./import/ImportGuestsDialog";

interface PendingImport {
  fileName: string;
  rows: string[][];
}

/** Imports guests from a spreadsheet (CSV or Excel): pick a file, then map its
 * columns in the "Import guests" dialog. Has a format help button. */
export function ImportButton(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);

  async function handleFile(file: File): Promise<void> {
    setMessage("Reading file…");
    try {
      const rows = cleanRows(await readGuestFileRows(file));
      if (rows.length === 0) {
        setMessage("No guests found in that file.");
        return;
      }
      setMessage(null);
      setPending({ fileName: file.name, rows });
    } catch {
      setMessage("Import failed. Check the file format.");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = ""; // allow re-importing the same file
        }}
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn btn-sm flex-1 btn-secondary"
        >
          Import Spreadsheet
        </button>
        <FormatHelp />
      </div>
      {message && <span className="text-xs text-base-content/60">{message}</span>}
      {pending && (
        <ImportGuestsDialog
          fileName={pending.fileName}
          rows={pending.rows}
          onCancel={() => setPending(null)}
          onImported={(summary) => {
            setPending(null);
            setMessage(summary);
          }}
        />
      )}
    </div>
  );
}
