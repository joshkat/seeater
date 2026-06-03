import type { Size } from "../types/geometry.js";
import type { TableShape } from "../types/table.js";

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

/** Grid spacing used for snapping in the editor. */
export const GRID_SIZE = 20;

/** Default size for a brand-new floor plan. */
export const DEFAULT_FLOOR_PLAN_SIZE: Size = { width: 1600, height: 1000 };

/** Convenience: default size for a table of the given shape. */
export function defaultSizeForShape(shape: TableShape): Size {
  return shape === "round"
    ? { width: DEFAULT_ROUND_DIAMETER, height: DEFAULT_ROUND_DIAMETER }
    : { ...DEFAULT_RECT_SIZE };
}
