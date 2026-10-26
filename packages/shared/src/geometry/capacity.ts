import type { Size } from "../types/geometry.js";
import type { TableShape } from "../document/schema.js";

/** Table edge per guest for a comfortable place setting (plan units = cm). */
export const COMFORT_SEAT_WIDTH = 60;
/** Below this much edge per chair, the chairs are jammed together. */
export const TIGHT_SEAT_WIDTH = 45;

/** The table edge chairs sit along: the circumference, or all four sides. */
function seatingEdge(shape: TableShape, size: Size): number {
  if (shape === "round") return Math.PI * size.width;
  return 2 * (size.width + size.height);
}

/** How many guests a table seats comfortably (null for rows of chairs, which
 * are as long as their chairs need). */
export function comfortableSeatCount(shape: TableShape, size: Size): number | null {
  if (shape === "row") return null;
  return Math.max(1, Math.floor(seatingEdge(shape, size) / COMFORT_SEAT_WIDTH));
}

/** Whether `count` chairs are squeezed onto a table this size. */
export function isTightSeating(shape: TableShape, size: Size, count: number): boolean {
  if (shape === "row" || count <= 1) return false;
  return count > Math.floor(seatingEdge(shape, size) / TIGHT_SEAT_WIDTH);
}

/**
 * The smallest size that seats `count` comfortably: a wider round, or a
 * longer rectangle (same depth). Never smaller than the current size.
 */
export function comfortableSizeFor(shape: TableShape, size: Size, count: number): Size {
  const edge = count * COMFORT_SEAT_WIDTH;
  if (shape === "round") {
    const diameter = Math.max(size.width, Math.ceil(edge / Math.PI));
    return { width: diameter, height: diameter };
  }
  if (shape === "row") return size;
  return { width: Math.max(size.width, Math.ceil(edge / 2 - size.height)), height: size.height };
}
