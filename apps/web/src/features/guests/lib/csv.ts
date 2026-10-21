import type { GuestInput } from "@seating/shared";

import { cleanRows, looksLikeHeader, mapRows, suggestMapping } from "./importMapping";

/**
 * Minimal CSV parsing for guest imports. Supports quoted fields (with embedded
 * commas, quotes, and newlines) and both CRLF/LF line endings.
 */

/** Splits raw CSV text into rows of string cells. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      // Finish the row on a newline; swallow the \n of a \r\n pair.
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  // Flush the trailing cell/row if the file doesn't end with a newline.
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export interface GuestImportResult {
  guests: GuestInput[];
  /** Number of rows skipped because they had no name. */
  skipped: number;
}

/** Back-compat alias. */
export type CsvImportResult = GuestImportResult;

/**
 * Maps rows of cells to guest inputs with the mapping the import dialog would
 * suggest. If the first row looks like a header (names a Name / First name /
 * Last name column) it maps the columns (`importFields.ts` lists the
 * recognised headers); otherwise columns are read positionally as name,
 * email, phone. Detail columns (household, RSVP, meal, tags…) need a header.
 * Shared by the CSV and spreadsheet (xlsx) importers.
 */
export function rowsToGuests(rawRows: string[][]): GuestImportResult {
  const rows = cleanRows(rawRows);
  if (rows.length === 0) return { guests: [], skipped: 0 };
  const hasHeader = looksLikeHeader(rows[0]);
  const { guests, skipped } = mapRows(rows, hasHeader, suggestMapping(rows, hasHeader));
  return { guests: guests.map((guest) => guest.input), skipped };
}

/** Parses CSV text into guest inputs (header-aware). */
export function parseGuestCsv(text: string): GuestImportResult {
  return rowsToGuests(parseCsvRows(text));
}
