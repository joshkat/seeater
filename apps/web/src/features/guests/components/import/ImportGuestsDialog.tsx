import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useModalFocus } from "../../../../lib/useModalFocus";
import { useGuests } from "../../../editor/hooks/useDocumentSelectors";
import type { ImportField } from "../../lib/importFields";
import {
  type ColumnMapping,
  columnLabels,
  dataRows,
  importSummary,
  looksLikeHeader,
  mapsAName,
  planImport,
  suggestMapping,
} from "../../lib/importMapping";
import { useGuestStore } from "../../store/guestStore";
import { ColumnMappingRow } from "./ColumnMappingRow";
import { DuplicateNotice } from "./DuplicateNotice";
import { ImportPreviewTable } from "./ImportPreviewTable";

interface ImportGuestsDialogProps {
  fileName: string;
  /** The file's non-blank rows. */
  rows: string[][];
  /** Called after importing, with the summary line to show. */
  onImported: (message: string) => void;
  onCancel: () => void;
}

/**
 * "Import guests": map each file column to a guest field (pre-filled from the
 * headers), preview the result, skip likely duplicates, then add everyone in
 * one edit (one undo step). Rendered over the whole app so it isn't clipped
 * by the guest drawer.
 */
export function ImportGuestsDialog({
  fileName,
  rows,
  onImported,
  onCancel,
}: ImportGuestsDialogProps): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  useModalFocus(boxRef);
  const importGuests = useGuestStore((state) => state.importGuests);
  const existingGuests = useGuests();
  const [hasHeader, setHasHeader] = useState(() => looksLikeHeader(rows[0]));
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    suggestMapping(rows, looksLikeHeader(rows[0])),
  );
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const labels = columnLabels(rows, hasHeader);
  const firstDataRow = dataRows(rows, hasHeader)[0] ?? [];
  const plan = useMemo(
    () =>
      planImport(rows, {
        hasHeader,
        mapping,
        existingNames: existingGuests.map((guest) => guest.name),
        skipDuplicates,
      }),
    [rows, hasHeader, mapping, existingGuests, skipDuplicates],
  );
  const named = mapsAName(mapping);
  const count = plan.toImport.length;

  function changeHeader(value: boolean): void {
    setHasHeader(value);
    setMapping(suggestMapping(rows, value));
  }

  function changeField(column: number, field: ImportField): void {
    setMapping((current) => current.map((value, index) => (index === column ? field : value)));
  }

  function runImport(): void {
    const added = importGuests(plan.toImport);
    const duplicatesSkipped = skipDuplicates ? plan.existingDuplicates + plan.fileDuplicates : 0;
    onImported(importSummary(added, duplicatesSkipped, plan.skipped));
  }

  return createPortal(
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Import guests">
      <div
        ref={boxRef}
        className="modal-box flex max-h-[90vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto text-base-content"
      >
        <div>
          <h2 className="text-lg font-semibold">Import guests</h2>
          <p className="truncate text-sm text-base-content/60" title={fileName}>
            {fileName}
          </p>
        </div>
        <p className="text-sm text-base-content/70">
          Choose what each column holds. The app recognises common wedding-site column names (first
          and last name, party, meal, RSVP…), so most columns are matched for you — check them
          before importing.
        </p>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={hasHeader}
            onChange={(event) => changeHeader(event.target.checked)}
          />
          First row is a header
        </label>

        <section aria-label="Columns" className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold text-base-content/70">Columns</h3>
          <ul className="max-h-64 divide-y divide-base-300 overflow-y-auto rounded-box border border-base-300 px-2.5">
            {labels.map((label, index) => (
              <ColumnMappingRow
                key={index}
                label={label}
                sample={(firstDataRow[index] ?? "").trim()}
                field={mapping[index] ?? "ignore"}
                onChange={(field) => changeField(index, field)}
              />
            ))}
          </ul>
          {!named && (
            <p className="text-sm text-error">
              Map a column to Name, or to First name and Last name, to import guests.
            </p>
          )}
        </section>

        <DuplicateNotice
          existing={plan.existingDuplicates}
          repeated={plan.fileDuplicates}
          skip={skipDuplicates}
          onSkipChange={setSkipDuplicates}
        />

        <section aria-label="Preview" className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold text-base-content/70">Preview</h3>
          <ImportPreviewTable plan={plan} mapping={mapping} skipDuplicates={skipDuplicates} />
          {plan.skipped > 0 && (
            <p className="text-xs text-base-content/60">
              {plan.skipped} row{plan.skipped === 1 ? " has" : "s have"} no name and will be
              skipped.
            </p>
          )}
        </section>

        <div className="modal-action mt-1">
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={count === 0}
            onClick={runImport}
          >
            Import {count} guest{count === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
