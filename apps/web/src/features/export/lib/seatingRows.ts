import type { EventDoc, Guest, LayoutView } from "@seating/shared";

/** One guest's place in a layout. */
export interface SeatingRow {
  guest: Guest;
  /** Null when the guest has no seat in this layout. */
  tableName: string | null;
  /** 0-based table order, for sorting (Infinity when unseated). */
  tableIndex: number;
  /** 1-based seat number, or null. */
  seatNumber: number | null;
}

/** Where every guest sits in a layout. */
export function seatingRows(doc: EventDoc, view: LayoutView): SeatingRow[] {
  const place = new Map<string, { tableName: string; tableIndex: number; seatNumber: number }>();
  view.tables.forEach((table, tableIndex) => {
    const tableName = table.label.trim() || `Table ${tableIndex + 1}`;
    for (const seat of table.seats) {
      place.set(seat.id, { tableName, tableIndex, seatNumber: seat.index + 1 });
    }
  });
  return doc.guests.map((guest) => {
    const seatId = view.seating.get(guest.id);
    const where = seatId ? place.get(seatId) : undefined;
    return {
      guest,
      tableName: where?.tableName ?? null,
      tableIndex: where?.tableIndex ?? Number.POSITIVE_INFINITY,
      seatNumber: where?.seatNumber ?? null,
    };
  });
}

/** Options shared by the printable lists. */
export interface PrintOptions {
  /** Leave out guests who declined (the default for anything printed). */
  includeDeclined: boolean;
}

function attending(rows: SeatingRow[], { includeDeclined }: PrintOptions): SeatingRow[] {
  return includeDeclined ? rows : rows.filter((row) => row.guest.rsvpStatus !== "declined");
}

/** Seated guests grouped by table (in table order, then seat order). */
export function tableRosters(
  rows: SeatingRow[],
  options: PrintOptions,
): { tableName: string; rows: SeatingRow[] }[] {
  const groups = new Map<number, { tableName: string; rows: SeatingRow[] }>();
  for (const row of attending(rows, options)) {
    if (row.tableName === null) continue;
    const group = groups.get(row.tableIndex) ?? { tableName: row.tableName, rows: [] };
    group.rows.push(row);
    groups.set(row.tableIndex, group);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, group]) => ({
      ...group,
      rows: group.rows.sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)),
    }));
}

/** Seated guests sorted by name (for "find your seat" lists, escort and place cards). */
export function alphabetical(rows: SeatingRow[], options: PrintOptions): SeatingRow[] {
  return attending(rows, options)
    .filter((row) => row.tableName !== null)
    .sort((a, b) => sortName(a.guest.name).localeCompare(sortName(b.guest.name)));
}

/** Sort by surname, then first name: "Ada Lovelace" → "Lovelace Ada". */
export function sortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts.at(-1)} ${parts.slice(0, -1).join(" ")}` : name;
}
