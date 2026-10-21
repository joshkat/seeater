import { type GuestImportResult, parseCsvRows, rowsToGuests } from "./csv";

/** File extensions we accept for guest imports. */
export const IMPORT_ACCEPT = ".csv,.xlsx,.xls,text/csv";

function isSpreadsheet(file: File): boolean {
  return /\.(xlsx|xls)$/i.test(file.name);
}

/** Reads the first sheet of an xlsx/xls file into rows of string cells. The
 * (heavy) SheetJS library is loaded on demand so it stays out of the main bundle. */
async function readSpreadsheetRows(file: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  // header:1 yields an array-of-arrays; blank cells become ''.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  return rows.map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
}

/** Reads a guest import file — CSV or Excel (.xlsx/.xls) — into rows of string cells. */
export async function readGuestFileRows(file: File): Promise<string[][]> {
  if (isSpreadsheet(file)) return readSpreadsheetRows(file);
  return parseCsvRows(await file.text());
}

/**
 * Parses a guest import file into guest inputs with the suggested column
 * mapping (no dialog). Both formats funnel through the same header-aware
 * row mapping.
 */
export async function parseGuestFile(file: File): Promise<GuestImportResult> {
  return rowsToGuests(await readGuestFileRows(file));
}
