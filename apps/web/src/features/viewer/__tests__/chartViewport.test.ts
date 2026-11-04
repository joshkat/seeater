import { describe, expect, it } from "vitest";

import {
  FIT_PADDING,
  clampView,
  fitView,
  focusView,
  panBy,
  scaleLimits,
  viewBoxOf,
  zoomAt,
} from "../lib/chartViewport";

const bounds = { x: 100, y: 50, width: 1000, height: 500 };
const size = { width: 532, height: 400 };

describe("fitView", () => {
  it("centres the bounds and fits the tighter side inside the padding", () => {
    const view = fitView(bounds, size);
    expect(view.center).toEqual({ x: 600, y: 300 });
    expect(view.scale).toBeCloseTo((532 - 2 * FIT_PADDING) / 1000);
    const box = viewBoxOf(view, size);
    // The viewBox keeps the screen's aspect, so nothing is letterboxed.
    expect(box.width / box.height).toBeCloseTo(size.width / size.height);
    expect(box.x).toBeLessThan(bounds.x);
    expect(box.x + box.width).toBeGreaterThan(bounds.x + bounds.width);
  });
});

describe("zoomAt", () => {
  it("keeps the plan point under the anchor in place", () => {
    const view = fitView(bounds, size);
    const anchor = { x: 100, y: 80 };
    const before = viewBoxOf(view, size);
    const zoomed = zoomAt(view, size, 2, anchor);
    const after = viewBoxOf(zoomed, size);
    expect(zoomed.scale).toBeCloseTo(view.scale * 2);
    expect(after.x + anchor.x / zoomed.scale).toBeCloseTo(before.x + anchor.x / view.scale);
    expect(after.y + anchor.y / zoomed.scale).toBeCloseTo(before.y + anchor.y / view.scale);
  });

  it("zooms about the middle by default", () => {
    const view = fitView(bounds, size);
    expect(zoomAt(view, size, 1.5).center).toEqual(view.center);
  });
});

describe("panBy", () => {
  it("moves the chart with the drag", () => {
    const view = { center: { x: 500, y: 300 }, scale: 2 };
    expect(panBy(view, 40, -20).center).toEqual({ x: 480, y: 310 });
  });
});

describe("clampView", () => {
  it("keeps the zoom in range and the middle over the chart", () => {
    const { min, max } = scaleLimits(bounds, size);
    const far = clampView({ center: { x: -5000, y: 9000 }, scale: 100 }, bounds, size);
    expect(far.scale).toBe(max);
    expect(far.center).toEqual({ x: 100, y: 550 });
    expect(clampView({ center: { x: 600, y: 300 }, scale: 0.0001 }, bounds, size).scale).toBe(min);
  });
});

describe("focusView", () => {
  it("centres on the target and zooms in on it", () => {
    const target = { x: 200, y: 100, width: 100, height: 100 };
    const view = focusView(target, bounds, size);
    expect(view.center).toEqual({ x: 250, y: 150 });
    expect(view.scale).toBeGreaterThan(fitView(bounds, size).scale);
    expect(view.scale).toBeCloseTo(2);
  });

  it("never zooms out past the whole chart for a big target", () => {
    const view = focusView(bounds, bounds, size);
    expect(view.scale).toBeCloseTo(fitView(bounds, size).scale);
  });
});
