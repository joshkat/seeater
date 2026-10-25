import { addGuests, addTable, autoSeat, createEventDoc } from "@seating/shared";
import { describe, expect, it } from "vitest";

import { autoSeatSummary } from "../lib/autoSeatSummary";

function event(names: string[], seats: number) {
  const base = createEventDoc({ name: "Auto" });
  const table = addTable(base, { shape: "round", position: { x: 400, y: 300 }, seatCount: seats });
  return addGuests(
    table.doc,
    names.map((name) => ({ name })),
  ).doc;
}

describe("autoSeatSummary", () => {
  it("says where each guest went", () => {
    const result = autoSeat(event(["Lise Meitner", "Niels Bohr"], 4), {});
    expect(autoSeatSummary(result)).toBe(
      "Auto-seated 2 guests: Lise Meitner → Table 1, Niels Bohr → Table 1.",
    );
  });

  it("lists the first three, counts the rest and names who didn't fit", () => {
    const result = autoSeat(event(["A", "B", "C", "D", "E", "F"], 5), {});
    expect(autoSeatSummary(result)).toBe(
      "Auto-seated 5 guests: A → Table 1, B → Table 1, C → Table 1 and 2 more. No room for F.",
    );
  });

  it("has no list when nobody was seated", () => {
    const result = autoSeat(event(["A"], 0), {});
    expect(autoSeatSummary(result)).toBe("No room for A.");
  });
});
