import { describe, expect, it } from "vitest";

import { copiedNotice } from "../lib/clipboardNotice";
import { nudgeSteps } from "../lib/nudge";

describe("copiedNotice", () => {
  it("counts tables and room items and says where Paste is", () => {
    expect(copiedNotice(11, 4, { where: "toolbar", shortcut: "⌘V" })).toBe(
      "Copied 11 tables and 4 room items. Paste with ⌘V or Paste in the toolbar.",
    );
    expect(copiedNotice(1, 0, { where: "menu", shortcut: "Ctrl+V" })).toBe(
      "Copied 1 table. Paste with Ctrl+V or Select ▾ → Paste.",
    );
  });

  it("leaves the shortcut out on touch screens", () => {
    expect(copiedNotice(0, 1, { where: "menu", shortcut: null })).toBe(
      "Copied 1 room item. Paste from Select ▾ → Paste.",
    );
  });
});

describe("nudgeSteps", () => {
  it("moves by round numbers in the event's units", () => {
    expect(nudgeSteps("metric")).toEqual({
      step: 10,
      large: 50,
      stepLabel: "10 cm",
      largeLabel: "50 cm",
    });
    const imperial = nudgeSteps("imperial");
    expect(imperial.step).toBeCloseTo(10.16);
    expect(imperial.large).toBeCloseTo(50.8);
    expect(imperial.stepLabel).toBe("4″");
  });
});
