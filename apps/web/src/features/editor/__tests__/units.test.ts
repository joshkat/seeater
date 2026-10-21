import { describe, expect, it } from "vitest";

import { fromLargeUnit, fromSmallUnit, resolveUnits, toLargeUnit, toSmallUnit } from "../lib/units";

describe("units", () => {
  it("resolves auto by locale", () => {
    expect(resolveUnits("auto", "en-US")).toBe("imperial");
    expect(resolveUnits("auto", "en-GB")).toBe("metric");
    expect(resolveUnits("auto", "de-DE")).toBe("metric");
    expect(resolveUnits("metric", "en-US")).toBe("metric");
  });

  it("converts table and room lengths", () => {
    expect(toSmallUnit(152, "imperial")).toBe(60);
    expect(toSmallUnit(152, "metric")).toBe(152);
    expect(fromSmallUnit(60, "imperial")).toBeCloseTo(152.4);
    expect(toLargeUnit(1600, "metric")).toBe(16);
    expect(toLargeUnit(1600, "imperial")).toBe(52);
    expect(fromLargeUnit(10, "imperial")).toBeCloseTo(304.8);
  });
});
