import type { GuestInput, RsvpStatus } from "@seating/shared";

import { type ImportField, fieldForHeader } from "./importFields";
import { rsvpMeta } from "./rsvp";

/**
 * Pure logic for the "Import guests" dialog: which guest field each column
 * holds, turning rows into guest inputs, RSVP values, and likely duplicates.
 * `rowsToGuests` (csv.ts) uses the same functions with the detected mapping.
 */

/** One field per column (index = column). */
export type ColumnMapping = ImportField[];

/** Without a header row, columns are read in this order (the rest are ignored). */
const POSITIONAL_FIELDS: ImportField[] = ["name", "email", "phone"];

const NAME_FIELDS = new Set<ImportField>(["name", "firstName", "lastName"]);

/** Drops rows with no content (cells are kept as read). */
export function cleanRows(rawRows: string[][]): string[][] {
  return rawRows.filter((row) => row.some((cell) => (cell ?? "").trim() !== ""));
}

/** The widest row's cell count. */
export function columnCount(rows: string[][]): number {
  return rows.reduce((max, row) => Math.max(max, row.length), 0);
}

/** A first row is a header when it names a name column (Name, First name, Last name…). */
export function looksLikeHeader(row: string[] | undefined): boolean {
  return (row ?? []).some((cell) => NAME_FIELDS.has(fieldForHeader(cell) ?? "ignore"));
}

/** Column titles for the dialog: the header text, or "Column 1", "Column 2"… */
export function columnLabels(rows: string[][], hasHeader: boolean): string[] {
  const header = rows[0] ?? [];
  return Array.from({ length: columnCount(rows) }, (_, index) => {
    const text = hasHeader ? (header[index] ?? "").trim() : "";
    return text || `Column ${index + 1}`;
  });
}

/**
 * The mapping we suggest. With a header, each recognised header maps to its
 * field (the first column wins when two name the same field; unknown headers
 * are ignored). Without one, columns are name, email, phone; detail columns
 * need a header so a stray 4th column can't invent households.
 */
export function suggestMapping(rows: string[][], hasHeader: boolean): ColumnMapping {
  const count = columnCount(rows);
  if (!hasHeader) {
    return Array.from({ length: count }, (_, index) => POSITIONAL_FIELDS[index] ?? "ignore");
  }
  const header = rows[0] ?? [];
  const used = new Set<ImportField>();
  return Array.from({ length: count }, (_, index) => {
    const field = fieldForHeader(header[index] ?? "");
    if (!field || used.has(field)) return "ignore";
    used.add(field);
    return field;
  });
}

const DECLINED =
  /^(n|no|nope|false|0)$|declin|regret|not (attending|going|coming)|won'?t|will not|can'?t|cannot|unable/;
const ACCEPTED =
  /^(y|yes|yep|yeah|true|1|x)$|\b(attending|accept(ed|s)?|going|coming|confirmed|will attend)\b/;
/** "Not confirmed", "No response", "unconfirmed" are still waiting. */
const NEGATED = /\b(not|no|un)\b|\bun\w/;

/** Reads an RSVP cell: yes / attending / accepted → accepted; no / declined / regrets → declined. */
export function parseRsvp(value: string): RsvpStatus {
  const text = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return "pending";
  if (DECLINED.test(text)) return "declined";
  if (NEGATED.test(text)) return "pending";
  if (ACCEPTED.test(text)) return "accepted";
  return "pending";
}

/** "yes", "x", "Child", "infant"… in a Child / Age group column. */
export function looksLikeChild(value: string): boolean {
  return /^(y|yes|x|true|1)$/i.test(value) || /child|kid|infant|baby|toddler/i.test(value);
}

/** Tags written in one cell: "Bride's side; Family" or "Work, Team". */
export function splitTags(value: string): string[] {
  return value
    .split(/[;,|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** One guest read from a data row. */
export interface MappedGuest {
  input: GuestInput;
  /** Index into the data rows (after the header). */
  row: number;
}

export interface MappedRows {
  guests: MappedGuest[];
  /** Data rows without a name. */
  skipped: number;
}

/** The data rows (everything after the header, when there is one). */
export function dataRows(rows: string[][], hasHeader: boolean): string[][] {
  return hasHeader ? rows.slice(1) : rows;
}

/**
 * Builds guest inputs from rows and a mapping. The name is the Name column, or
 * "First Last" from First name / Last name columns. Several columns mapped to
 * one field are combined (text joined, tags merged; email, phone, RSVP,
 * household and meal take the first filled one). Only mapped fields appear on
 * the input (email and phone are always present, null when blank).
 */
export function mapRows(rows: string[][], hasHeader: boolean, mapping: ColumnMapping): MappedRows {
  const columns = (field: ImportField): number[] =>
    mapping.flatMap((mapped, index) => (mapped === field ? [index] : []));
  const byField = new Map<ImportField, number[]>();
  for (const field of new Set(mapping)) byField.set(field, columns(field));
  const has = (field: ImportField): boolean => (byField.get(field)?.length ?? 0) > 0;
  const values = (row: string[], field: ImportField): string[] =>
    (byField.get(field) ?? []).map((index) => (row[index] ?? "").trim()).filter(Boolean);
  const first = (row: string[], field: ImportField): string => values(row, field)[0] ?? "";
  const joined = (row: string[], field: ImportField, separator: string): string =>
    values(row, field).join(separator);

  const guests: MappedGuest[] = [];
  let skipped = 0;
  dataRows(rows, hasHeader).forEach((row, index) => {
    const name =
      joined(row, "name", " ") ||
      [joined(row, "firstName", " "), joined(row, "lastName", " ")].filter(Boolean).join(" ");
    if (!name) {
      skipped += 1;
      return;
    }
    const input: GuestInput = {
      name: name.replace(/\s+/g, " "),
      email: first(row, "email") || null,
      phone: first(row, "phone") || null,
    };
    const household = first(row, "household");
    if (household) input.household = household;
    const meal = first(row, "meal");
    if (meal) input.meal = meal;
    for (const key of ["dietary", "accessibility", "notes"] as const) {
      const value = joined(row, key, "; ");
      if (value) input[key] = value;
    }
    const tags = values(row, "tags").flatMap(splitTags);
    if (tags.length > 0) input.tags = tags;
    if (values(row, "isChild").some(looksLikeChild)) input.isChild = true;
    if (has("rsvp")) input.rsvpStatus = parseRsvp(first(row, "rsvp"));
    guests.push({ input, row: index });
  });
  return { guests, skipped };
}

/** Name as compared for duplicates: case-insensitive, whitespace collapsed. */
export function duplicateKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Why a row looks like a duplicate: it matches a guest already in the event, or an earlier row. */
export type DuplicateKind = "existing" | "file";

/**
 * Flags each guest whose name matches an existing guest's or an earlier row's
 * (the first row of a repeated name is not flagged). Same order as `guests`.
 */
export function findDuplicates(
  guests: GuestInput[],
  existingNames: Iterable<string>,
): (DuplicateKind | null)[] {
  const existing = new Set([...existingNames].map(duplicateKey));
  const seen = new Set<string>();
  return guests.map((guest) => {
    const key = duplicateKey(guest.name);
    if (existing.has(key)) return "existing";
    if (seen.has(key)) return "file";
    seen.add(key);
    return null;
  });
}

/** Everything the dialog shows and imports for one mapping. */
export interface ImportPlan {
  guests: MappedGuest[];
  duplicates: (DuplicateKind | null)[];
  /** Rows without a name. */
  skipped: number;
  existingDuplicates: number;
  fileDuplicates: number;
  /** What Import adds (duplicates left out when skipping them). */
  toImport: GuestInput[];
}

export function planImport(
  rows: string[][],
  options: {
    hasHeader: boolean;
    mapping: ColumnMapping;
    existingNames: Iterable<string>;
    skipDuplicates: boolean;
  },
): ImportPlan {
  const { guests, skipped } = mapRows(rows, options.hasHeader, options.mapping);
  const duplicates = findDuplicates(
    guests.map((guest) => guest.input),
    options.existingNames,
  );
  return {
    guests,
    duplicates,
    skipped,
    existingDuplicates: duplicates.filter((kind) => kind === "existing").length,
    fileDuplicates: duplicates.filter((kind) => kind === "file").length,
    toImport: guests
      .filter((_, index) => !(options.skipDuplicates && duplicates[index]))
      .map((guest) => guest.input),
  };
}

/** Whether a mapping gives guests a name at all (Import needs one). */
export function mapsAName(mapping: ColumnMapping): boolean {
  return mapping.some((field) => NAME_FIELDS.has(field));
}

/** The mapped fields in picker order, without name parts or "ignore" (preview columns). */
export function previewFields(mapping: ColumnMapping): ImportField[] {
  const order: ImportField[] = [
    "email",
    "phone",
    "rsvp",
    "household",
    "meal",
    "dietary",
    "accessibility",
    "notes",
    "tags",
    "isChild",
  ];
  return order.filter((field) => mapping.includes(field));
}

/** A guest's value for one preview column, as text. */
export function previewValue(input: GuestInput, field: ImportField): string {
  switch (field) {
    case "name":
      return input.name;
    case "rsvp":
      return rsvpMeta(input.rsvpStatus ?? "pending").label;
    case "tags":
      return (input.tags ?? []).join(", ");
    case "isChild":
      return input.isChild ? "Yes" : "";
    case "email":
    case "phone":
    case "household":
    case "meal":
    case "dietary":
    case "accessibility":
    case "notes":
      return input[field] ?? "";
    default:
      return "";
  }
}

/** The line shown after an import, e.g. "Imported 3 guests (skipped 1 duplicate)." */
export function importSummary(added: number, duplicatesSkipped: number, unnamed: number): string {
  const plural = (count: number, word: string): string =>
    `${count} ${word}${count === 1 ? "" : "s"}`;
  const skipped = [
    duplicatesSkipped > 0 ? plural(duplicatesSkipped, "duplicate") : "",
    unnamed > 0 ? `${unnamed} without a name` : "",
  ].filter(Boolean);
  return `Imported ${plural(added, "guest")}${skipped.length ? ` (skipped ${skipped.join(", ")})` : ""}.`;
}
