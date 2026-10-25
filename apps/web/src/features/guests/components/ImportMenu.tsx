import { useRef, useState } from "react";

import { cleanRows } from "../lib/importMapping";
import { IMPORT_ACCEPT, readGuestFileRows } from "../lib/spreadsheet";
import { ImportGuestsDialog } from "./import/ImportGuestsDialog";

interface PendingImport {
  fileName: string;
  rows: string[][];
}

interface ImportMenuProps {
  /** A status line to show under the panel's actions ("Imported 8 guests…"),
   * or null to clear it. */
  onMessage: (message: string | null) => void;
  /** "Spreadsheet format": shows the format help under the actions. */
  onShowHelp: () => void;
}

/** "Import ▾": import guests from a spreadsheet (CSV or Excel) — pick a file,
 * then map its columns in the "Import guests" dialog — or read the format help. */
export function ImportMenu({ onMessage, onShowHelp }: ImportMenuProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const closeMenu = (): void => (document.activeElement as HTMLElement | null)?.blur();

  async function handleFile(file: File): Promise<void> {
    onMessage("Reading file…");
    try {
      const rows = cleanRows(await readGuestFileRows(file));
      if (rows.length === 0) {
        onMessage("No guests found in that file.");
        return;
      }
      onMessage(null);
      setPending({ fileName: file.name, rows });
    } catch {
      onMessage("Import failed. Check the file format.");
    }
  }

  return (
    <div className="dropdown">
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
      <button type="button" tabIndex={0} className="btn btn-sm">
        Import ▾
      </button>
      <ul className="dropdown-content menu z-30 mt-1 w-56 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        <li>
          <button
            type="button"
            onClick={() => {
              closeMenu();
              inputRef.current?.click();
            }}
          >
            From spreadsheet…
            <span className="text-xs text-base-content/70">CSV or Excel</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              closeMenu();
              onShowHelp();
            }}
          >
            Spreadsheet format
          </button>
        </li>
      </ul>
      {pending && (
        <ImportGuestsDialog
          fileName={pending.fileName}
          rows={pending.rows}
          onCancel={() => setPending(null)}
          onImported={(summary) => {
            setPending(null);
            onMessage(summary);
          }}
        />
      )}
    </div>
  );
}
