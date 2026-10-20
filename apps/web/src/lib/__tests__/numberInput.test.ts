import { describe, expect, it } from "vitest";

import { clampNumber, commitNumberDraft, sanitizeNumberDraft } from "../numberInput";

describe("number field rules", () => {
  it("strips everything but digits", () => {
    expect(sanitizeNumberDraft("1a2-3.4")).toBe("1234");
    expect(sanitizeNumberDraft("")).toBe("");
  });

  it("treats a blank draft as the empty value, defaulting to min", () => {
    expect(commitNumberDraft("", { min: 1, max: 64 })).toBe(1);
    expect(commitNumberDraft("  ", { min: 40, emptyValue: 120 })).toBe(120);
  });

  it("clamps into range", () => {
    expect(commitNumberDraft("0", { min: 1, max: 64 })).toBe(1);
    expect(commitNumberDraft("99", { min: 1, max: 64 })).toBe(64);
    expect(commitNumberDraft("12", { min: 1, max: 64 })).toBe(12);
    expect(clampNumber(7.6, { min: 1 })).toBe(8);
  });
});
