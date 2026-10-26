import { describe, expect, it } from "vitest";

import { panToShow } from "../geometry/panToShow";

const stage = { width: 800, height: 600 };
const table = { position: { x: 400, y: 300 }, size: { width: 120, height: 120 } };

describe("panToShow", () => {
  it("leaves the view alone when the table is already visible", () => {
    const viewport = { x: 0, y: 0, scale: 1 };
    expect(panToShow(viewport, stage, table)).toBe(viewport);
  });

  it("pans (without zooming) to a table that's off-screen", () => {
    const viewport = { x: -1000, y: 0, scale: 0.5 };
    expect(panToShow(viewport, stage, table)).toEqual({ x: 200, y: 150, scale: 0.5 });
  });

  it("treats the space under a prompt as hidden", () => {
    const low = { position: { x: 400, y: 520 }, size: { width: 120, height: 120 } };
    const viewport = { x: 0, y: 0, scale: 1 };
    expect(panToShow(viewport, stage, low)).not.toBe(viewport);
    // Visible height 350: the table is centred in it.
    expect(panToShow(viewport, stage, table, 250)).toEqual({ x: 0, y: -125, scale: 1 });
  });
});
