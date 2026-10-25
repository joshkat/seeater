import type { Point, Size } from "../types/geometry.js";
import {
  CHAIR_RADIUS,
  type ChairSides,
  DEFAULT_SEAT_COUNT,
  MAX_SEAT_COUNT,
  type TablePreset,
  defaultSizeForShape,
  rowWidthFor,
} from "../geometry/constants.js";
import { computeAutoSeatOffsets, sideSeatOffsets } from "../geometry/seatLayout.js";
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
  /** Chairs on one side or both long sides (custom layout); default all round. */
  chairs?: ChairSides;
}

/** Adds a table with evenly-spaced chairs. Returns the new table's id. */
export function addTable(
  doc: EventDoc,
  options: NewTableOptions,
): { doc: EventDoc; tableId: string } {
  const count = clampSeatCount(options.seatCount ?? DEFAULT_SEAT_COUNT);
  const size = options.size ?? defaultSizeForShape(options.shape, count);
  const sides = options.chairs && options.chairs !== "around" ? options.chairs : null;
  const mode = sides ? "custom" : (options.chairLayoutMode ?? "auto");
  const offsets = sides
    ? sideSeatOffsets(size, count, sides)
    : mode === "custom"
      ? computeAutoSeatOffsets(options.shape, size, count)
      : null;
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
    // A row is as long as its chairs need.
    const size = table.shape === "row" ? { ...table.size, width: rowWidthFor(next) } : table.size;
    const offsets =
      table.chairLayoutMode === "custom" ? computeAutoSeatOffsets(table.shape, size, next) : null;
    return { ...table, size, seats: buildSeats(table.seats, next, offsets) };
  });
  return unseatOrphans(updated);
}

/**
 * Guests who had a seat in `before` and have none in `after` (in the active
 * layout), in guest-list order: who a table delete or a chair cut unseated,
 * for the notice that says so.
 */
export function newlyUnseatedIds(before: EventDoc, after: EventDoc): string[] {
  const seatedBefore = new Set(before.guests.filter((g) => g.seatId).map((g) => g.id));
  return after.guests.filter((g) => !g.seatId && seatedBefore.has(g.id)).map((g) => g.id);
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

/** Adds a table from a preset (real size, chair count and chair sides). */
export function addTableFromPreset(
  doc: EventDoc,
  preset: TablePreset,
  position: Point,
): { doc: EventDoc; tableId: string } {
  return addTable(doc, {
    shape: preset.shape,
    size: preset.size,
    seatCount: preset.seatCount,
    chairs: preset.chairs,
    position,
  });
}

/** A table's axis-aligned footprint (rotation included), chairs not counted. */
export function tableBounds(table: Table): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const rad = (table.rotation * Math.PI) / 180;
  const halfW =
    (Math.abs(Math.cos(rad)) * table.size.width + Math.abs(Math.sin(rad)) * table.size.height) / 2;
  const halfH =
    (Math.abs(Math.sin(rad)) * table.size.width + Math.abs(Math.cos(rad)) * table.size.height) / 2;
  return {
    minX: table.position.x - halfW,
    minY: table.position.y - halfH,
    maxX: table.position.x + halfW,
    maxY: table.position.y + halfH,
  };
}

export type AlignEdge = "left" | "center" | "right" | "top" | "middle" | "bottom";

/** Lines tables up on an edge or centre line of the selection's bounds. */
export function alignTables(doc: EventDoc, tableIds: string[], edge: AlignEdge): EventDoc {
  const ids = new Set(tableIds);
  const chosen = doc.tables.filter((table) => ids.has(table.id));
  if (chosen.length < 2) return doc;
  const bounds = chosen.map(tableBounds);
  const minX = Math.min(...bounds.map((b) => b.minX));
  const maxX = Math.max(...bounds.map((b) => b.maxX));
  const minY = Math.min(...bounds.map((b) => b.minY));
  const maxY = Math.max(...bounds.map((b) => b.maxY));
  return {
    ...doc,
    tables: doc.tables.map((table) => {
      if (!ids.has(table.id)) return table;
      const b = tableBounds(table);
      const { x, y } = table.position;
      const position =
        edge === "left"
          ? { x: x + (minX - b.minX), y }
          : edge === "right"
            ? { x: x + (maxX - b.maxX), y }
            : edge === "center"
              ? { x: (minX + maxX) / 2, y }
              : edge === "top"
                ? { x, y: y + (minY - b.minY) }
                : edge === "bottom"
                  ? { x, y: y + (maxY - b.maxY) }
                  : { x, y: (minY + maxY) / 2 };
      return { ...table, position };
    }),
  };
}

/** Spaces tables evenly (equal gaps) between the outermost two, along one axis. */
export function distributeTables(
  doc: EventDoc,
  tableIds: string[],
  axis: "horizontal" | "vertical",
): EventDoc {
  const ids = new Set(tableIds);
  const chosen = doc.tables.filter((table) => ids.has(table.id));
  if (chosen.length < 3) return doc;
  const horizontal = axis === "horizontal";
  const span = (table: Table): [number, number] => {
    const b = tableBounds(table);
    return horizontal ? [b.minX, b.maxX] : [b.minY, b.maxY];
  };
  const sorted = [...chosen].sort((a, b) => span(a)[0] - span(b)[0]);
  const start = span(sorted[0])[0];
  const end = Math.max(...sorted.map((table) => span(table)[1]));
  const total = sorted.reduce((sum, table) => sum + (span(table)[1] - span(table)[0]), 0);
  const gap = (end - start - total) / (sorted.length - 1);

  const moved = new Map<string, Point>();
  let cursor = start;
  for (const table of sorted) {
    const [lo, hi] = span(table);
    const shift = cursor - lo;
    moved.set(
      table.id,
      horizontal
        ? { x: table.position.x + shift, y: table.position.y }
        : { x: table.position.x, y: table.position.y + shift },
    );
    cursor += hi - lo + gap;
  }
  return {
    ...doc,
    tables: doc.tables.map((table) =>
      moved.has(table.id) ? { ...table, position: moved.get(table.id)! } : table,
    ),
  };
}

export interface TableGridOptions {
  count: number;
  columns: number;
  /** A preset, or a basic shape with the default size. */
  preset?: TablePreset;
  shape?: TableShape;
  seatCount?: number;
  /** Space between tables, chairs included (plan units). */
  gap?: number;
  /** Centre of the whole grid. */
  center: Point;
}

/** Adds `count` tables laid out in a grid (one edit). Returns the new ids. */
export function addTableGrid(
  doc: EventDoc,
  options: TableGridOptions,
): { doc: EventDoc; tableIds: string[] } {
  const count = Math.max(0, Math.min(MAX_TABLES_PER_GRID, Math.round(options.count)));
  const columns = Math.max(1, Math.min(count || 1, Math.round(options.columns)));
  const rows = Math.ceil(count / columns);
  const shape = options.preset?.shape ?? options.shape ?? "round";
  const seatCount = options.preset?.seatCount ?? options.seatCount ?? DEFAULT_SEAT_COUNT;
  const size = options.preset?.size ?? defaultSizeForShape(shape, seatCount);
  // Footprint including the ring of chairs around the table.
  const chairRoom = shape === "row" ? 0 : 2 * (CHAIR_RADIUS * 2 + 6);
  const gap = options.gap ?? 80;
  const stepX = size.width + chairRoom + gap;
  const stepY = size.height + chairRoom + gap;
  const originX = options.center.x - ((columns - 1) * stepX) / 2;
  const originY = options.center.y - ((rows - 1) * stepY) / 2;

  let next = doc;
  const tableIds: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const position = {
      x: originX + (i % columns) * stepX,
      y: originY + Math.floor(i / columns) * stepY,
    };
    const added = options.preset
      ? addTableFromPreset(next, options.preset, position)
      : addTable(next, { shape, seatCount, position });
    next = added.doc;
    tableIds.push(added.tableId);
  }
  return { doc: next, tableIds };
}

/** Most tables one grid adds. */
export const MAX_TABLES_PER_GRID = 100;
