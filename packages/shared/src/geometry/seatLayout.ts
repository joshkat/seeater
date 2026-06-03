import type { Point, Size } from "../types/geometry.js";
import type { SeatInput } from "../types/seat.js";
import type { Table, TableShape } from "../types/table.js";
import { CHAIR_GAP, CHAIR_RADIUS } from "./constants.js";

/** Distance from a table edge to a chair center. */
const CHAIR_OFFSET = CHAIR_GAP + CHAIR_RADIUS;

/**
 * Distributes `total` discrete items across buckets proportionally to
 * `weights`, using the largest-remainder method so the parts sum exactly to
 * `total`. Used to split chairs across the four sides of a rectangle.
 */
export function distributeByWeight(weights: number[], total: number): number[] {
  const sum = weights.reduce((acc, w) => acc + w, 0);
  if (sum <= 0 || total <= 0) {
    return weights.map(() => 0);
  }

  const exact = weights.map((w) => (w / sum) * total);
  const result = exact.map(Math.floor);
  let remaining = total - result.reduce((acc, n) => acc + n, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < remaining; k += 1) {
    result[byRemainder[k % byRemainder.length].index] += 1;
  }

  return result;
}

function roundSeatOffsets(diameter: number, count: number): Point[] {
  const ring = diameter / 2 + CHAIR_OFFSET;
  const start = -Math.PI / 2; // first chair at the top
  return Array.from({ length: count }, (_, i) => {
    const angle = start + (i / count) * Math.PI * 2;
    return { x: ring * Math.cos(angle), y: ring * Math.sin(angle) };
  });
}

/** Even chair centers along one rectangle side, in [-half, half]. */
function evenAlong(half: number, count: number): number[] {
  const span = half * 2;
  return Array.from({ length: count }, (_, k) => -half + ((k + 0.5) * span) / count);
}

function rectangleSeatOffsets(size: Size, count: number): Point[] {
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  // Sides: top, right, bottom, left — weighted by their length.
  const [top, right, bottom, left] = distributeByWeight(
    [size.width, size.height, size.width, size.height],
    count,
  );

  const offsets: Point[] = [];
  // Top: left -> right
  evenAlong(halfW, top).forEach((x) => offsets.push({ x, y: -(halfH + CHAIR_OFFSET) }));
  // Right: top -> bottom
  evenAlong(halfH, right).forEach((y) => offsets.push({ x: halfW + CHAIR_OFFSET, y }));
  // Bottom: right -> left
  evenAlong(halfW, bottom)
    .reverse()
    .forEach((x) => offsets.push({ x, y: halfH + CHAIR_OFFSET }));
  // Left: bottom -> top
  evenAlong(halfH, left)
    .reverse()
    .forEach((y) => offsets.push({ x: -(halfW + CHAIR_OFFSET), y }));

  return offsets;
}

/**
 * Computes evenly-spaced chair offsets (relative to table center, before
 * rotation) for an auto layout.
 */
export function computeAutoSeatOffsets(shape: TableShape, size: Size, count: number): Point[] {
  if (count <= 0) return [];
  return shape === "round"
    ? roundSeatOffsets(size.width, count)
    : rectangleSeatOffsets(size, count);
}

/**
 * Resolves the render position (relative to table center, before rotation) of
 * every seat on a table. Auto layouts are computed; custom layouts use each
 * seat's stored offset.
 */
export function resolveSeatPositions(table: Table): Point[] {
  const seats = [...table.seats].sort((a, b) => a.index - b.index);

  if (table.chairLayoutMode === "custom") {
    return seats.map((seat) => seat.offset ?? { x: 0, y: 0 });
  }

  return computeAutoSeatOffsets(table.shape, table.size, seats.length);
}

/** Seat inputs for an auto layout: ordered indices with no stored offset. */
export function makeAutoSeatInputs(count: number): SeatInput[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    index,
    label: null,
    offset: null,
  }));
}

/**
 * Seat inputs for switching a table to custom mode: seeds explicit offsets
 * from the current auto arrangement so users don't start from an empty table.
 */
export function makeCustomSeatInputsFromAuto(
  shape: TableShape,
  size: Size,
  count: number,
): SeatInput[] {
  return computeAutoSeatOffsets(shape, size, count).map((offset, index) => ({
    index,
    label: null,
    offset,
  }));
}
