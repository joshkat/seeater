import { TABLE_PRESETS } from "@seating/shared";
import { describe, expect, it } from "vitest";

import { presetLabel } from "../lib/presetLabel";

const preset = (id: string) => TABLE_PRESETS.find((candidate) => candidate.id === id)!;

describe("presetLabel", () => {
  it("names sizes in the event's units", () => {
    expect(presetLabel(preset("round-48"), "metric")).toBe("Round 120 cm · 6");
    expect(presetLabel(preset("round-48"), "imperial")).toBe("Round 48″ · 6");
    expect(presetLabel(preset("banquet-6"), "metric")).toBe("Banquet 180 × 75 cm · 6");
    expect(presetLabel(preset("banquet-6"), "imperial")).toBe("Banquet 6 ft · 6");
    expect(presetLabel(preset("head-16"), "imperial")).toBe("Head table 16 ft · 8");
  });

  it("leaves the size off rows of chairs", () => {
    expect(presetLabel(preset("row-10"), "metric")).toBe("Row of chairs · 10");
  });
});
