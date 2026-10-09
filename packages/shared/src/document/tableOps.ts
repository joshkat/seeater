import type { Point, Size } from "../types/geometry.js";
import { DEFAULT_SEAT_COUNT, MAX_SEAT_COUNT, defaultSizeForShape } from "../geometry/constants.js";
import { computeAutoSeatOffsets } from "../geometry/seatLayout.js";
import { newId } from "./ids.js";
import {
  type ChairLayoutMode,
  type EventDoc,
  MAX_TABLE_LABEL_LENGTH,
  type Seat,
  type Table,
  type TableShape,
} from "./schema.js";

/**
 * Pure table/seat operations on an EventDoc. Every function returns a new
 * document (inputs are never mutated) and keeps the document valid: seats stay
 * indexed 0..n-1, and guests whose seat disappears are unseated in the same
 * step — so there's no separate "sync assignments" pass anywhere.
 */

/** Number of chairs, clamped to the supported range and rounded. */
export function clampSeatCount(count: number): number {
  return Math.max(0, Math.min(MAX_SEAT_COUNT, Math.round(count)));
}

/** Builds `count` seats, reusing ids from `previous` by index so guests stay seated. */
function buildSeats(previous: Seat[], count: number, offsets: (Point | null)[] | null): Seat[] {
  return Array.from({ length: count }, (_, index) => ({
    id: previous[index]?.id ?? newId(),
    index,
    label: previous[index]?.label ?? null,
    offset: offsets ? (offsets[index] ?? null) : null,
  }));
}

/** Clears seat assignments that point at seats no longer in the document. */
function unseatOrphans(doc: EventDoc): EventDoc {
  const seatIds = new Set(doc.tables.flatMap((table) => table.seats.map((seat) => seat.id)));
  if (doc.guests.every((guest) => guest.seatId === null || seatIds.has(guest.seatId))) {
    return doc;
  }
  return {
    ...doc,
    guests: doc.guests.map((guest) =>
      guest.seatId !== null && !seatIds.has(guest.seatId) ? { ...guest, seatId: null } : guest,
    ),
  };
}

function mapTable(doc: EventDoc, tableId: string, update: (table: Table) => Table): EventDoc {
  let changed = false;
  const tables = doc.tables.map((table) => {
    if (table.id !== tableId) return table;
    changed = true;
    return update(table);
  });
  return changed ? { ...doc, tables } : doc;
}

export interface NewTableOptions {
  shape: TableShape;
  position: Point;
  size?: Size;
  label?: string;
  rotation?: number;
  chairLayoutMode?: ChairLayoutMode;
  seatCount?: number;
}

/** Adds a table with evenly-spaced chairs. Returns the new table's id. */
export function addTable(
  doc: EventDoc,
  options: NewTableOptions,
): { doc: EventDoc; tableId: string } {
  const size = options.size ?? defaultSizeForShape(options.shape);
  const mode = options.chairLayoutMode ?? "auto";
  const count = clampSeatCount(options.seatCount ?? DEFAULT_SEAT_COUNT);
  const offsets = mode === "custom" ? computeAutoSeatOffsets(options.shape, size, count) : null;
  const table: Table = {
    id: newId(),
    label: (options.label ?? "").slice(0, MAX_TABLE_LABEL_LENGTH),
    shape: options.shape,
    position: options.position,
    rotation: options.rotation ?? 0,
    size,
    chairLayoutMode: mode,
    seats: buildSeats([], count, offsets),
  };
  return { doc: { ...doc, tables: [...doc.tables, table] }, tableId: table.id };
}

export interface TableTransform {
  position?: Point;
  size?: Size;
  rotation?: number;
}

/** Moves, resizes and/or rotates a table. Seats (and their guests) are untouched. */
export function updateTableTransform(
  doc: EventDoc,
  tableId: string,
  transform: TableTransform,
): EventDoc {
  return mapTable(doc, tableId, (table) => ({
    ...table,
    position: transform.position ?? table.position,
    size: transform.size ?? table.size,
    rotation: transform.rotation ?? table.rotation,
  }));
}

export function setTableLabel(doc: EventDoc, tableId: string, label: string): EventDoc {
  return mapTable(doc, tableId, (table) => ({
    ...table,
    label: label.slice(0, MAX_TABLE_LABEL_LENGTH),
  }));
}

/**
 * Changes a table's chair count. Surviving seats keep their ids (so seated
 * guests stay put); guests in removed seats are unseated. In custom mode the
 * chairs are re-spread evenly, matching the previous server behavior.
 */
export function setSeatCount(doc: EventDoc, tableId: string, count: number): EventDoc {
  const next = clampSeatCount(count);
  const updated = mapTable(doc, tableId, (table) => {
    const offsets =
      table.chairLayoutMode === "custom"
        ? computeAutoSeatOffsets(table.shape, table.size, next)
        : null;
    return { ...table, seats: buildSeats(table.seats, next, offsets) };
  });
  return unseatOrphans(updated);
}

/**
 * Switches between auto and custom chair layouts. Going custom seeds each seat
 * with the explicit offset it already occupies under the auto layout; going
 * auto drops the offsets. Seat ids (and guests) are preserved either way.
 */
export function setChairMode(doc: EventDoc, tableId: string, mode: ChairLayoutMode): EventDoc {
  return mapTable(doc, tableId, (table) => {
    if (table.chairLayoutMode === mode) return table;
    const offsets =
      mode === "custom"
        ? computeAutoSeatOffsets(table.shape, table.size, table.seats.length)
        : null;
    return {
      ...table,
      chairLayoutMode: mode,
      seats: buildSeats(table.seats, table.seats.length, offsets),
    };
  });
}

/** Moves one chair (switching the table to custom layout if needed). */
export function setSeatOffset(
  doc: EventDoc,
  tableId: string,
  seatIndex: number,
  offset: Point,
): EventDoc {
  const custom = setChairMode(doc, tableId, "custom");
  return mapTable(custom, tableId, (table) => ({
    ...table,
    seats: table.seats.map((seat) => (seat.index === seatIndex ? { ...seat, offset } : seat)),
  }));
}

/** Copies tables (fresh table + seat ids, nudged by `nudge`). Guests aren't copied. */
export function duplicateTables(
  doc: EventDoc,
  tableIds: string[],
  nudge = 24,
): { doc: EventDoc; tableIds: string[] } {
  const wanted = new Set(tableIds);
  const copies: Table[] = doc.tables
    .filter((table) => wanted.has(table.id))
    .map((table) => ({
      ...table,
      id: newId(),
      position: { x: table.position.x + nudge, y: table.position.y + nudge },
      seats: table.seats.map((seat) => ({ ...seat, id: newId() })),
    }));
  return {
    doc: { ...doc, tables: [...doc.tables, ...copies] },
    tableIds: copies.map((table) => table.id),
  };
}

/** Removes tables; their guests return to the unassigned list. */
export function deleteTables(doc: EventDoc, tableIds: string[]): EventDoc {
  const doomed = new Set(tableIds);
  if (!doc.tables.some((table) => doomed.has(table.id))) return doc;
  return unseatOrphans({ ...doc, tables: doc.tables.filter((table) => !doomed.has(table.id)) });
}
