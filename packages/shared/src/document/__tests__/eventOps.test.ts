import { describe, expect, it } from "vitest";

import { duplicateEventDoc, reidentifyEventDoc, renameEventDoc } from "../eventOps.js";
import { assignSeat } from "../guestOps.js";
import { eventDocSchema } from "../schema.js";
import { summarizeEventDoc } from "../summary.js";
import { fixture, seatIdsOf } from "./fixture.js";

function seatedFixture() {
  const { doc, tableId, guestIds } = fixture();
  return assignSeat(doc, guestIds[0], seatIdsOf(doc, tableId)[2]);
}

describe("duplicateEventDoc", () => {
  it("copies only the layout by default", () => {
    const source = seatedFixture();
    const copy = duplicateEventDoc(source);
    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe("Fixture (copy)");
    expect(copy.tables).toHaveLength(1);
    expect(copy.tables[0].id).not.toBe(source.tables[0].id);
    expect(copy.guests).toEqual([]);
    expect(eventDocSchema.safeParse(copy).success).toBe(true);
  });

  it("remaps seat assignments onto the cloned seats", () => {
    const source = seatedFixture();
    const copy = duplicateEventDoc(source, { copyGuests: true, copyAssignments: true });
    const seatedGuest = copy.guests.find((g) => g.name === "Ada")!;
    expect(seatedGuest.seatId).toBe(copy.tables[0].seats[2].id);
    expect(eventDocSchema.safeParse(copy).success).toBe(true);
  });

  it("drops assignments when only guests are copied", () => {
    const copy = duplicateEventDoc(seatedFixture(), { copyGuests: true });
    expect(copy.guests).toHaveLength(3);
    expect(copy.guests.every((g) => g.seatId === null)).toBe(true);
  });
});

describe("reidentifyEventDoc", () => {
  it("changes every id but keeps content", () => {
    const source = seatedFixture();
    const copy = reidentifyEventDoc(source);
    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe(source.name);
    expect(summarizeEventDoc(copy)).toMatchObject({ guestCount: 3, seatedCount: 1, tableCount: 1 });
  });
});

describe("renameEventDoc", () => {
  it("ignores blank names and returns the same object when unchanged", () => {
    const { doc } = fixture();
    expect(renameEventDoc(doc, "  ")).toBe(doc);
    expect(renameEventDoc(doc, "Fixture")).toBe(doc);
    expect(renameEventDoc(doc, " Gala ").name).toBe("Gala");
  });
});
