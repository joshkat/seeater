import type { Point } from "@seating/shared";

import type { Bounds } from "../../export/lib/chartScene";

/**
 * Pan and zoom for the read-only chart, as plain math over a view: the plan
 * point at the middle of the screen and the zoom (screen pixels per plan
 * unit). The SVG's viewBox is derived from it, so it always has the
 * viewport's aspect and nothing is letterboxed.
 */
export interface ChartView {
  center: Point;
  scale: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

/** Empty screen around a fitted chart, in pixels. */
export const FIT_PADDING = 16;
/** How far out (× the fitted zoom) and in (plan units → px) the chart zooms. */
const MIN_ZOOM_OF_FIT = 0.5;
const MAX_SCALE_OF_FIT = 8;
const MAX_SCALE_FLOOR = 4;
/** One press of + or −. */
export const ZOOM_STEP = 1.25;

function fitScale(bounds: Bounds, size: ViewportSize, padding: number): number {
  const width = Math.max(1, size.width - 2 * padding);
  const height = Math.max(1, size.height - 2 * padding);
  return Math.min(width / Math.max(1, bounds.width), height / Math.max(1, bounds.height));
}

/** The whole of `bounds`, centred. */
export function fitView(bounds: Bounds, size: ViewportSize, padding = FIT_PADDING): ChartView {
  return {
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    scale: fitScale(bounds, size, padding),
  };
}

/** The zoom range for a chart: half the fitted zoom out, 8× (at least 4 px/unit) in. */
export function scaleLimits(bounds: Bounds, size: ViewportSize): { min: number; max: number } {
  const fit = fitScale(bounds, size, FIT_PADDING);
  return { min: fit * MIN_ZOOM_OF_FIT, max: Math.max(fit * MAX_SCALE_OF_FIT, MAX_SCALE_FLOOR) };
}

/** Keeps the zoom in range and the middle of the screen over the chart. */
export function clampView(view: ChartView, bounds: Bounds, size: ViewportSize): ChartView {
  const { min, max } = scaleLimits(bounds, size);
  return {
    scale: Math.min(max, Math.max(min, view.scale)),
    center: {
      x: Math.min(bounds.x + bounds.width, Math.max(bounds.x, view.center.x)),
      y: Math.min(bounds.y + bounds.height, Math.max(bounds.y, view.center.y)),
    },
  };
}

/** The SVG viewBox for a view (plan units). */
export function viewBoxOf(view: ChartView, size: ViewportSize): Bounds {
  const width = size.width / view.scale;
  const height = size.height / view.scale;
  return { x: view.center.x - width / 2, y: view.center.y - height / 2, width, height };
}

/** Zooms by `factor`, keeping the plan point under `anchor` (screen px) in place. */
export function zoomAt(
  view: ChartView,
  size: ViewportSize,
  factor: number,
  anchor: Point = { x: size.width / 2, y: size.height / 2 },
): ChartView {
  const box = viewBoxOf(view, size);
  const planX = box.x + anchor.x / view.scale;
  const planY = box.y + anchor.y / view.scale;
  const scale = view.scale * factor;
  return {
    scale,
    center: {
      x: planX - (anchor.x - size.width / 2) / scale,
      y: planY - (anchor.y - size.height / 2) / scale,
    },
  };
}

/** Moves the chart by a drag of (dx, dy) screen pixels. */
export function panBy(view: ChartView, dx: number, dy: number): ChartView {
  return {
    scale: view.scale,
    center: { x: view.center.x - dx / view.scale, y: view.center.y - dy / view.scale },
  };
}

/**
 * Brings `target` (e.g. one table and its chairs) into view: centred, zoomed
 * to fill about half the screen, but never further out than `whole` fitted
 * (a picked table never makes the chart smaller).
 */
export function focusView(target: Bounds, whole: Bounds, size: ViewportSize): ChartView {
  const half = { width: size.width / 2, height: size.height / 2 };
  const scale = Math.max(fitScale(target, half, 0), fitScale(whole, size, FIT_PADDING));
  return clampView(
    {
      center: { x: target.x + target.width / 2, y: target.y + target.height / 2 },
      scale,
    },
    whole,
    size,
  );
}
