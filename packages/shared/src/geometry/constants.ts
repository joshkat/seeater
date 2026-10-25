import type { Size } from "../types/geometry.js";
import type { TableShape } from "../document/schema.js";

/**
 * Layout constants in floor-plan units. The editor renders these through its
 * own pan/zoom transform, so they're resolution-independent.
 */

/** Radius of a rendered chair. */
export const CHAIR_RADIUS = 9;

/** Gap between the table edge and the inner edge of a chair. */
export const CHAIR_GAP = 6;

/** Default diameter for a new round table. */
export const DEFAULT_ROUND_DIAMETER = 120;

/** Default footprint for a new rectangular table. */
export const DEFAULT_RECT_SIZE: Size = { width: 180, height: 90 };

/** Default chair count for a new table. */
export const DEFAULT_SEAT_COUNT = 8;

/** Most chairs a single table can have. */
export const MAX_SEAT_COUNT = 64;

/** Grid spacing used for snapping in the editor. */
export const GRID_SIZE = 20;

/** Default size for a brand-new floor plan. */
export const DEFAULT_FLOOR_PLAN_SIZE: Size = { width: 1600, height: 1000 };

/** Chair-to-chair spacing in a row of chairs (plan units = cm). */
export const ROW_CHAIR_SPACING = 55;
/** Depth of a row of chairs (its hit area). */
export const ROW_DEPTH = 50;

/** The length a row needs for `count` chairs. */
export function rowWidthFor(count: number): number {
  return Math.max(1, count) * ROW_CHAIR_SPACING;
}

/** Convenience: default size for a table of the given shape. */
export function defaultSizeForShape(shape: TableShape, seatCount = DEFAULT_SEAT_COUNT): Size {
  if (shape === "round") return { width: DEFAULT_ROUND_DIAMETER, height: DEFAULT_ROUND_DIAMETER };
  if (shape === "row") return { width: rowWidthFor(seatCount), height: ROW_DEPTH };
  return { ...DEFAULT_RECT_SIZE };
}

/** Where a preset's chairs go. */
export type ChairSides = "around" | "one-side" | "long-sides";

/** A ready-made table: real sizes (cm) and a typical chair count. */
export interface TablePreset {
  id: string;
  /** Short kind name ("Round", "Banquet"); the app adds the size in the
   * event's units and the chair count. */
  kind: string;
  shape: TableShape;
  size: Size;
  seatCount: number;
  chairs: ChairSides;
}

/** Standard event furniture. Sizes in plan units (centimetres). */
export const TABLE_PRESETS: TablePreset[] = [
  {
    id: "round-48",
    kind: "Round",
    shape: "round",
    size: { width: 122, height: 122 },
    seatCount: 6,
    chairs: "around",
  },
  {
    id: "round-60",
    kind: "Round",
    shape: "round",
    size: { width: 152, height: 152 },
    seatCount: 8,
    chairs: "around",
  },
  {
    id: "round-72",
    kind: "Round",
    shape: "round",
    size: { width: 183, height: 183 },
    seatCount: 10,
    chairs: "around",
  },
  {
    id: "banquet-6",
    kind: "Banquet",
    shape: "rectangle",
    size: { width: 183, height: 76 },
    seatCount: 6,
    chairs: "long-sides",
  },
  {
    id: "banquet-8",
    kind: "Banquet",
    shape: "rectangle",
    size: { width: 244, height: 76 },
    seatCount: 8,
    chairs: "long-sides",
  },
  {
    id: "head-8",
    kind: "Head table",
    shape: "rectangle",
    size: { width: 244, height: 76 },
    seatCount: 4,
    chairs: "one-side",
  },
  {
    id: "head-16",
    kind: "Head table",
    shape: "rectangle",
    size: { width: 488, height: 76 },
    seatCount: 8,
    chairs: "one-side",
  },
  {
    id: "row-10",
    kind: "Row of chairs",
    shape: "row",
    size: { width: rowWidthFor(10), height: ROW_DEPTH },
    seatCount: 10,
    chairs: "around",
  },
];
