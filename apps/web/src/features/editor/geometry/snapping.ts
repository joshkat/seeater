import type { Point } from "@seating/shared";
import { GRID_SIZE } from "@seating/shared";

import type { AlignmentGuide } from "../types";

/** Snaps a single value to the nearest grid line. */
export function snapToGrid(value: number, grid = GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

interface SnapParams {
  /** Proposed table-center position (floor-plan units). */
  position: Point;
  /** Centers of the other tables to align against. */
  otherCenters: Point[];
  /** Max distance to snap to an alignment line, in floor-plan units. */
  threshold: number;
}

/** Returns the nearest center within `threshold`, or null. */
function nearestCenter(value: number, candidates: number[], threshold: number): number | null {
  let best: number | null = null;
  let bestDistance = threshold;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance <= bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Resolves a drag position to a snapped position plus any alignment guides.
 * Center-to-center alignment with other tables takes precedence over grid
 * snapping on each axis independently.
 */
export function resolveSnap({ position, otherCenters, threshold }: SnapParams): {
  position: Point;
  guides: AlignmentGuide[];
} {
  const guides: AlignmentGuide[] = [];

  const alignedX = nearestCenter(
    position.x,
    otherCenters.map((center) => center.x),
    threshold,
  );
  const alignedY = nearestCenter(
    position.y,
    otherCenters.map((center) => center.y),
    threshold,
  );

  const x = alignedX ?? snapToGrid(position.x);
  const y = alignedY ?? snapToGrid(position.y);

  if (alignedX !== null) guides.push({ axis: "x", position: alignedX });
  if (alignedY !== null) guides.push({ axis: "y", position: alignedY });

  return { position: { x, y }, guides };
}
