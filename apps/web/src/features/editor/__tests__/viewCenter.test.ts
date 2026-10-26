import { describe, expect, it } from "vitest";

import { centerOfView } from "../geometry/viewCenter";

const floor = { width: 2000, height: 1200 };

describe("centerOfView", () => {
  it("is the middle of the visible area", () => {
    const view = { minX: 400, minY: 200, maxX: 1000, maxY: 600 };
    expect(centerOfView(view, floor, { width: 300, height: 200 })).toEqual({ x: 700, y: 400 });
  });

  it("keeps the footprint on the floor near an edge", () => {
    const view = { minX: -200, minY: 900, maxX: 200, maxY: 1300 };
    expect(centerOfView(view, floor, { width: 600, height: 400 })).toEqual({ x: 300, y: 1000 });
  });

  it("centres on the floor along an axis the footprint doesn't fit", () => {
    const view = { minX: 0, minY: 0, maxX: 400, maxY: 400 };
    expect(centerOfView(view, floor, { width: 2400, height: 200 })).toEqual({ x: 1000, y: 200 });
  });

  it("uses the floor's centre before the canvas has a size", () => {
    expect(centerOfView(null, floor, { width: 300, height: 200 })).toEqual({ x: 1000, y: 600 });
  });
});
