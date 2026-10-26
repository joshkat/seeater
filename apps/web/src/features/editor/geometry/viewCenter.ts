import type { Point, Rect, Size } from "@seating/shared";

function clamp(value: number, min: number, max: number): number {
  return min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value));
}

/**
 * Where to centre something `footprint` big so it lands in the middle of the
 * screen (`view`, the visible part of the floor): the view's centre, nudged
 * so the whole footprint stays on the floor (centred on the floor along an
 * axis it doesn't fit). With no view yet, the floor's centre.
 */
export function centerOfView(view: Rect | null, floor: Size, footprint: Size): Point {
  const x = view ? (view.minX + view.maxX) / 2 : floor.width / 2;
  const y = view ? (view.minY + view.maxY) / 2 : floor.height / 2;
  return {
    x: clamp(x, footprint.width / 2, floor.width - footprint.width / 2),
    y: clamp(y, footprint.height / 2, floor.height - footprint.height / 2),
  };
}
