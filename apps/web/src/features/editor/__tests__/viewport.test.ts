import { describe, expect, it } from "vitest";

import { MAX_SCALE, pinchViewport } from "../geometry/viewport";

const view = { x: 100, y: 50, scale: 1 };

describe("pinchViewport", () => {
  it("pans with two fingers moving together", () => {
    const next = pinchViewport(
      view,
      { center: { x: 300, y: 300 }, distance: 100 },
      { center: { x: 340, y: 280 }, distance: 100 },
    );
    expect(next).toEqual({ x: 140, y: 30, scale: 1 });
  });

  it("zooms about the fingers' midpoint", () => {
    const frame = { center: { x: 300, y: 250 }, distance: 100 };
    const next = pinchViewport(view, frame, { ...frame, distance: 200 });
    expect(next.scale).toBe(2);
    // The plan point under the midpoint stays under it.
    const before = { x: (300 - view.x) / view.scale, y: (250 - view.y) / view.scale };
    const after = { x: (300 - next.x) / next.scale, y: (250 - next.y) / next.scale };
    expect(after).toEqual(before);
  });

  it("clamps the zoom and ignores degenerate frames", () => {
    const frame = { center: { x: 0, y: 0 }, distance: 10 };
    expect(pinchViewport(view, frame, { ...frame, distance: 1000 }).scale).toBe(MAX_SCALE);
    expect(pinchViewport(view, { ...frame, distance: 0 }, frame)).toBe(view);
  });
});
