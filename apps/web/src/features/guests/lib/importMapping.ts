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
  const data = rows.slice(1);
  const used = new Set<ImportField>();
  return Array.from({ length: count }, (_, index) => {
    const values = data.map((row) => row[index] ?? "");
    const field = fieldForHeader(header[index] ?? "", values);
    if (!field || used.has(field)) return "ignore";
    used.add(field);
    return field;
  });
}

/**
 * The mapping after "First row is a header" is toggled: columns the user
 * picked by hand keep their pick (by position); the rest get the new
 * suggestion.
 */
export function remapForHeader(
  rows: string[][],
  hasHeader: boolean,
  current: ColumnMapping,
  userEdited: ReadonlySet<number>,
): ColumnMapping {
  return suggestMapping(rows, hasHeader).map((suggested, index) =>
    userEdited.has(index) ? (current[index] ?? suggested) : suggested,
  );
}

/**
 * Columns with data that won't be imported (mapped to Ignore), by label —
 * for "2 columns won't be imported: Partner First Name, Street Address."
 */
export function ignoredColumns(
  rows: string[][],
  hasHeader: boolean,
  mapping: ColumnMapping,
): string[] {
  const labels = columnLabels(rows, hasHeader);
  const data = dataRows(rows, hasHeader);
  return labels.filter(
    (_, index) =>
      (mapping[index] ?? "ignore") === "ignore" &&
      data.some((row) => (row[index] ?? "").trim() !== ""),
  );
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
  /** The second person on a party-per-row line (Partner first/last name). */
  partner?: boolean;
}

/** Identifies a mapped guest across mapping changes (row, and which person on it). */
export function guestKey(guest: MappedGuest): string {
  return guest.partner ? `${guest.row}:partner` : `${guest.row}`;
}

/** The row number as the file shows it (counting the header), e.g. for "Sam Lee (row 9)". */
export function fileRowNumber(row: number, hasHeader: boolean): number {
  return row + (hasHeader ? 2 : 1);
}

/** A one-word partner name ("Lou") takes the guest's last name; a full one is kept. */
function partnerName(first: string, last: string, guestLast: string): string {
  if (!first && !last) return "";
  const surname = last || (first && !/\s/.test(first) ? guestLast : "");
  return [first, surname].filter(Boolean).join(" ");
}

/** A pair's household: the party column, else their last names ("Hill", "Hill & Moss"),
 * else both names. */
function pairHousehold(party: string, lastNames: string[], names: [string, string]): string {
  if (party) return party;
  const unique = [...new Map(lastNames.filter(Boolean).map((n) => [n.toLowerCase(), n])).values()];
  return unique.length > 0 ? unique.join(" & ") : names.join(" & ");
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
 *
 * A row with a partner (Partner first / last name) gives a second guest right
 * after the first, in the same household (the party column, else their last
 * names), with the row's RSVP and tags. Their own email, meal and other
 * details aren't on the row, so they're left blank.
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
  const tidy = (name: string): string => name.replace(/\s+/g, " ").trim();
  dataRows(rows, hasHeader).forEach((row, index) => {
    const lastName = joined(row, "lastName", " ");
    const name = tidy(
      joined(row, "name", " ") ||
        [joined(row, "firstName", " "), lastName].filter(Boolean).join(" "),
    );
    const partnerLast = joined(row, "partnerLastName", " ");
    const partner = tidy(partnerName(joined(row, "partnerFirstName", " "), partnerLast, lastName));
    if (!name && !partner) {
      skipped += 1;
      return;
    }
    const tags = values(row, "tags").flatMap(splitTags);
    const rsvp = has("rsvp") ? parseRsvp(first(row, "rsvp")) : undefined;
    const party = first(row, "household");
    // A full name in the partner column ("Jo Park") carries its own surname.
    const partnerSurname = partnerLast || (partner.includes(" ") ? partner.split(" ").pop()! : "");
    const household =
      name && partner ? pairHousehold(party, [lastName, partnerSurname], [name, partner]) : party;

    if (name) {
      const input: GuestInput = {
        name,
        email: first(row, "email") || null,
        phone: first(row, "phone") || null,
      };
      if (household) input.household = household;
      const meal = first(row, "meal");
      if (meal) input.meal = meal;
      for (const key of ["dietary", "accessibility", "notes"] as const) {
        const value = joined(row, key, "; ");
        if (value) input[key] = value;
      }
      if (tags.length > 0) input.tags = tags;
      if (values(row, "isChild").some(looksLikeChild)) input.isChild = true;
      if (rsvp) input.rsvpStatus = rsvp;
      guests.push({ input, row: index });
    }
    if (partner) {
      const input: GuestInput = { name: partner, email: null, phone: null };
      if (household) input.household = household;
      if (tags.length > 0) input.tags = tags;
      if (rsvp) input.rsvpStatus = rsvp;
      guests.push({ input, row: index, partner: true });
    }
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

/** A likely duplicate that Import will leave out, for the notice. */
export interface SkippedDuplicate {
  name: string;
  /** As the file numbers it (see fileRowNumber). */
  fileRow: number;
}

/** Everything the dialog shows and imports for one mapping. */
export interface ImportPlan {
  guests: MappedGuest[];
  duplicates: (DuplicateKind | null)[];
  /** Per guest: left out of the import (a duplicate, skipped, not imported anyway). */
  excluded: boolean[];
  /** Rows without a name. */
  skipped: number;
  existingDuplicates: number;
  fileDuplicates: number;
  /** The duplicates being left out, in file order. */
  skippedDuplicates: SkippedDuplicate[];
  /** What Import adds (duplicates left out when skipping them). */
  toImport: GuestInput[];
  /** How many of `toImport` are partners from party-per-row lines. */
  partnersToImport: number;
}

export function planImport(
  rows: string[][],
  options: {
    hasHeader: boolean;
    mapping: ColumnMapping;
    existingNames: Iterable<string>;
    skipDuplicates: boolean;
    /** guestKey()s of duplicates to import even though duplicates are skipped. */
    importAnyway?: ReadonlySet<string>;
  },
): ImportPlan {
  const { guests, skipped } = mapRows(rows, options.hasHeader, options.mapping);
  const duplicates = findDuplicates(
    guests.map((guest) => guest.input),
    options.existingNames,
  );
  const excluded = guests.map(
    (guest, index) =>
      options.skipDuplicates &&
      duplicates[index] !== null &&
      !options.importAnyway?.has(guestKey(guest)),
  );
  const kept = guests.filter((_, index) => !excluded[index]);
  return {
    guests,
    duplicates,
    excluded,
    skipped,
    existingDuplicates: duplicates.filter((kind) => kind === "existing").length,
    fileDuplicates: duplicates.filter((kind) => kind === "file").length,
    skippedDuplicates: guests
      .filter((_, index) => excluded[index])
      .map((guest) => ({
        name: guest.input.name,
        fileRow: fileRowNumber(guest.row, options.hasHeader),
      })),
    toImport: kept.map((guest) => guest.input),
    partnersToImport: kept.filter((guest) => guest.partner).length,
  };
}

/** "Skipping 1 likely duplicate: Sam Lee (row 9)." — names up to `limit`, then "and N more". */
export function skippedDuplicatesText(skipped: SkippedDuplicate[], limit = 5): string {
  if (skipped.length === 0) return "";
  const named = skipped.slice(0, limit).map((entry) => `${entry.name} (row ${entry.fileRow})`);
  const more = skipped.length - named.length;
  const list = more > 0 ? `${named.join(", ")} and ${more} more` : named.join(", ");
  return `Skipping ${skipped.length} likely duplicate${skipped.length === 1 ? "" : "s"}: ${list}.`;
}

/** "2 columns won't be imported: Title, Street Address." */
export function ignoredColumnsText(labels: string[]): string {
  if (labels.length === 0) return "";
  const count = labels.length === 1 ? "1 column won’t" : `${labels.length} columns won’t`;
  return `${count} be imported: ${labels.join(", ")}.`;
}

/** The Import button: "Import 3 guests (1 partner)". */
export function importButtonLabel(count: number, partners: number): string {
  const base = `Import ${count} guest${count === 1 ? "" : "s"}`;
  return partners > 0 ? `${base} (${partners} partner${partners === 1 ? "" : "s"})` : base;
}

/** Whether a mapping gives guests a name at all (Import needs one). */
export function mapsAName(mapping: ColumnMapping): boolean {
  return mapping.some((field) => NAME_FIELDS.has(field));
}

/** The mapped fields in picker order, without name (or partner name) parts or "ignore"
 * (preview columns). */
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
