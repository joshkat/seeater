import type { Size, Table } from "@seating/shared";
import { CHAIR_GAP, CHAIR_RADIUS, resolveSeatPositions } from "@seating/shared";

import type { Viewport } from "../types";

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;
/** Multiplicative step for the wheel. */
export const WHEEL_ZOOM = 1.05;
/** Larger step for the +/- buttons. */
export const BUTTON_ZOOM = 1.25;

export interface StageSize {
  width: number;
  height: number;
}

export function clampScale(scale: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

/** Fit-to-view: the whole floor plan centered with a little margin. */
export function fitViewport(dimensions: Size, stage: StageSize): Viewport {
  const scale = clampScale(
    Math.min((stage.width / dimensions.width) * 0.9, (stage.height / dimensions.height) * 0.9),
  );
  return {
    scale,
    x: (stage.width - dimensions.width * scale) / 2,
    y: (stage.height - dimensions.height * scale) / 2,
  };
}

/** Viewport that zooms in on and centers a single table (including its chairs). */
export function focusViewportForTable(table: Table, stage: StageSize): Viewport {
  let halfW = table.size.width / 2;
  let halfH = table.size.height / 2;
  for (const seat of resolveSeatPositions(table)) {
    halfW = Math.max(halfW, Math.abs(seat.x) + CHAIR_RADIUS);
    halfH = Math.max(halfH, Math.abs(seat.y) + CHAIR_RADIUS);
  }
  // Treat the table+chairs as a square so rotation can't clip it; pad a little.
  const radius = Math.max(halfW, halfH) + 24;
  const fill = 0.7; // table occupies ~70% of the smaller stage dimension
  const scale = clampScale((Math.min(stage.width, stage.height) * fill) / (radius * 2));
  return {
    scale,
    x: stage.width / 2 - table.position.x * scale,
    y: stage.height / 2 - table.position.y * scale,
  };
}

/** Zoom by a factor about the stage center, keeping that point fixed. */
export function zoomViewportAtCenter(
  viewport: Viewport,
  stage: StageSize,
  factor: number,
): Viewport {
  const scale = clampScale(viewport.scale * factor);
  const cx = stage.width / 2;
  const cy = stage.height / 2;
  const worldX = (cx - viewport.x) / viewport.scale;
  const worldY = (cy - viewport.y) / viewport.scale;
  return { scale, x: cx - worldX * scale, y: cy - worldY * scale };
}

/**
 * Clamps a table's center position so the table (plus chairs) stays fully
 * inside the floor plan. The table is treated as a square whose half-extent
 * is max(halfW, halfH) + CHAIR_RADIUS + CHAIR_GAP so rotation and custom
 * chairs never push it out of bounds.
 */
export function clampTablePosition(
  pos: { x: number; y: number },
  tableSize: Size,
  planDimensions: Size,
): { x: number; y: number } {
  // Half-extent from the table center to the outer edge of a chair:
  // halfSize + gap + chair-center-radius + chair-radius.
  const halfExtent = Math.max(tableSize.width, tableSize.height) / 2 + CHAIR_GAP + 2 * CHAIR_RADIUS;
  return {
    x: Math.max(halfExtent, Math.min(planDimensions.width - halfExtent, pos.x)),
    y: Math.max(halfExtent, Math.min(planDimensions.height - halfExtent, pos.y)),
  };
}

/** Whether a viewport meaningfully differs from "home" (for showing Reset). */
export function isAwayFromHome(viewport: Viewport, home: Viewport | null): boolean {
  if (!home) return false;
  return (
    Math.abs(viewport.scale - home.scale) > 0.001 ||
    Math.abs(viewport.x - home.x) > 0.5 ||
    Math.abs(viewport.y - home.y) > 0.5
  );
}

/** Two fingers on the canvas: their midpoint (stage pixels) and spread. */
export interface PinchFrame {
  center: { x: number; y: number };
  distance: number;
}

/**
 * One step of a pinch: scales by how much the fingers spread and keeps the
 * plan point under their midpoint moving with it, so a single gesture both
 * zooms and pans (two-finger pan is a pinch with constant spread).
 */
export function pinchViewport(viewport: Viewport, from: PinchFrame, to: PinchFrame): Viewport {
  if (from.distance <= 0 || to.distance <= 0) return viewport;
  const scale = clampScale(viewport.scale * (to.distance / from.distance));
  const anchor = {
    x: (from.center.x - viewport.x) / viewport.scale,
    y: (from.center.y - viewport.y) / viewport.scale,
  };
  return { scale, x: to.center.x - anchor.x * scale, y: to.center.y - anchor.y * scale };
}
