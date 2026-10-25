import { describe, expect, it } from "vitest";

import {
  comfortableSeatCount,
  comfortableSizeFor,
  isTightSeating,
} from "../../geometry/capacity.js";

const round = (diameter: number) => ({ width: diameter, height: diameter });

describe("table capacity", () => {
  it("knows a 4 ft round seats 6 and a 6 ft round 9", () => {
    expect(comfortableSeatCount("round", round(122))).toBe(6);
    expect(comfortableSeatCount("round", round(183))).toBe(9);
    expect(comfortableSeatCount("row", { width: 550, height: 50 })).toBeNull();
  });

  it("flags chairs squeezed past what fits", () => {
    // The default 8 on a 120 cm round is snug, not jammed.
    expect(isTightSeating("round", round(120), 8)).toBe(false);
    expect(isTightSeating("round", round(120), 9)).toBe(true);
    expect(isTightSeating("round", round(120), 40)).toBe(true);
    expect(isTightSeating("rectangle", { width: 183, height: 76 }, 6)).toBe(false);
    expect(isTightSeating("row", { width: 100, height: 50 }, 40)).toBe(false);
  });

  it("suggests a size that seats everyone comfortably", () => {
    const bigger = comfortableSizeFor("round", round(120), 12);
    expect(comfortableSeatCount("round", bigger)).toBeGreaterThanOrEqual(12);
    const longer = comfortableSizeFor("rectangle", { width: 100, height: 76 }, 10);
    expect(longer.height).toBe(76);
    expect(comfortableSeatCount("rectangle", longer)).toBeGreaterThanOrEqual(10);
    // Never shrinks.
    expect(comfortableSizeFor("round", round(300), 4)).toEqual(round(300));
  });
});
