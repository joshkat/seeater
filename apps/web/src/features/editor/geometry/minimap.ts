import type { Point, Size } from "@seating/shared";

import type { Viewport } from "../types";
import type { StageSize } from "./viewport";

/** A rectangle in plan units. */
export interface PlanRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The part of the room the canvas currently shows (plan units). */
export function visibleRect(viewport: Viewport, stage: StageSize): PlanRect {
  return {
    x: -viewport.x / viewport.scale,
    y: -viewport.y / viewport.scale,
    width: stage.width / viewport.scale,
    height: stage.height / viewport.scale,
  };
}

/** Whether the whole floor is on screen (then a minimap adds nothing). */
export function showsWholeFloor(viewport: Viewport, stage: StageSize, floor: Size): boolean {
  const view = visibleRect(viewport, stage);
  // A centimetre of slack for rounding.
  return (
    view.x <= 1 &&
    view.y <= 1 &&
    view.x + view.width >= floor.width - 1 &&
    view.y + view.height >= floor.height - 1
  );
}

/** The same zoom, panned so `point` (plan units) is in the middle of the canvas. */
export function centerViewportOn(point: Point, viewport: Viewport, stage: StageSize): Viewport {
  return {
    scale: viewport.scale,
    x: stage.width / 2 - point.x * viewport.scale,
    y: stage.height / 2 - point.y * viewport.scale,
  };
}
