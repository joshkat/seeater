import { describe, expect, it } from "vitest";

import { centerViewportOn, showsWholeFloor, visibleRect } from "../geometry/minimap";
import { fitViewport } from "../geometry/viewport";

const stage = { width: 800, height: 600 };
const floor = { width: 2000, height: 1400 };

describe("minimap geometry", () => {
  it("knows the visible part of the room", () => {
    expect(visibleRect({ x: -200, y: -100, scale: 2 }, stage)).toEqual({
      x: 100,
      y: 50,
      width: 400,
      height: 300,
    });
  });

  it("is not needed when the whole floor fits", () => {
    expect(showsWholeFloor(fitViewport(floor, stage), stage, floor)).toBe(true);
    expect(showsWholeFloor({ x: 0, y: 0, scale: 1 }, stage, floor)).toBe(false);
  });

  it("centres the canvas on a point, keeping the zoom", () => {
    const viewport = centerViewportOn({ x: 1000, y: 700 }, { x: 0, y: 0, scale: 0.5 }, stage);
    expect(viewport).toEqual({ scale: 0.5, x: -100, y: -50 });
    const view = visibleRect(viewport, stage);
    expect(view.x + view.width / 2).toBe(1000);
    expect(view.y + view.height / 2).toBe(700);
  });
});
