import type { GuestInput } from '@seating/shared';

/**
 * Minimal CSV parsing for guest imports. Supports quoted fields (with embedded
 * commas, quotes, and newlines) and both CRLF/LF line endings.
 */

/** Splits raw CSV text into rows of string cells. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
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
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      // Finish the row on a newline; swallow the \n of a \r\n pair.
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
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

const HEADER_ALIASES: Record<string, keyof GuestInput> = {
  name: 'name',
  names: 'name',
  'full name': 'name',
  'guest name': 'name',
  'first name': 'name',
  guest: 'name',
  attendee: 'name',
  email: 'email',
  emails: 'email',
  'e-mail': 'email',
  'email address': 'email',
  phone: 'phone',
  phones: 'phone',
  'phone number': 'phone',
  mobile: 'phone',
  cell: 'phone',
};

/** Maps a header row to column indices, or null if no header is recognized. */
function detectHeader(cells: string[]): Partial<Record<keyof GuestInput, number>> | null {
  const map: Partial<Record<keyof GuestInput, number>> = {};
  cells.forEach((cell, index) => {
    const key = HEADER_ALIASES[cell.trim().toLowerCase()];
    if (key && map[key] === undefined) map[key] = index;
  });
  return map.name !== undefined ? map : null;
}

export interface GuestImportResult {
  guests: GuestInput[];
  /** Number of rows skipped because they had no name. */
  skipped: number;
}

/** Back-compat alias. */
export type CsvImportResult = GuestImportResult;

/**
 * Maps rows of cells to guest inputs. If the first row looks like a header
 * (contains a recognizable "name" column) it's used to map columns; otherwise
 * columns are read positionally as name, email, phone. Shared by the CSV and
 * spreadsheet (xlsx) importers.
 */
export function rowsToGuests(rawRows: string[][]): GuestImportResult {
  const rows = rawRows.filter((row) => row.some((cell) => (cell ?? '').trim() !== ''));
  if (rows.length === 0) return { guests: [], skipped: 0 };

  const header = detectHeader(rows[0]);
  const dataRows = header ? rows.slice(1) : rows;
  const col = {
    name: header?.name ?? 0,
    email: header?.email ?? 1,
    phone: header?.phone ?? 2,
  };

  const guests: GuestInput[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    const name = (row[col.name] ?? '').trim();
    if (!name) {
      skipped += 1;
      continue;
    }
    const email = (row[col.email] ?? '').trim();
    const phone = (row[col.phone] ?? '').trim();
    guests.push({
      name,
      email: email || null,
      phone: phone || null,
    });
  }

  return { guests, skipped };
}

/** Parses CSV text into guest inputs (header-aware). */
export function parseGuestCsv(text: string): GuestImportResult {
  return rowsToGuests(parseCsvRows(text));
}
