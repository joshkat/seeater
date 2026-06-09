import { useRef, useState } from "react";

import { parseGuestFile } from "../lib/spreadsheet";
import { IMPORT_ACCEPT } from "../lib/spreadsheet";
import { useGuestStore } from "../store/guestStore";
import { FormatHelp } from "./FormatHelp";

/** Imports guests from a spreadsheet (CSV or Excel), with a format help button. */
export function ImportButton(): JSX.Element {
  const importGuests = useGuestStore((state) => state.importGuests);
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File): Promise<void> {
    setMessage("Importing…");
    try {
      const { guests, skipped } = await parseGuestFile(file);
      if (guests.length === 0) {
        setMessage("No guests found in that file.");
        return;
      }
      const added = await importGuests(guests);
      setMessage(
        `Imported ${added} guest${added === 1 ? "" : "s"}${skipped ? ` (skipped ${skipped})` : ""}.`,
      );
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
    </div>
  );
}
