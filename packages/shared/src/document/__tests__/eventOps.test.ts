import { describe, expect, it } from "vitest";

import {
  duplicateEventDoc,
  isExactSeatPlacement,
  reidentifyEventDoc,
  renameEventDoc,
  restoreEventDoc,
  setExactSeatPlacement,
} from "../eventOps.js";
import { assignSeat } from "../guestOps.js";
import { createHousehold } from "../householdOps.js";
import { addTable } from "../tableOps.js";
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

  it("copies households with fresh ids when guests are copied", () => {
    const { doc, guestIds } = fixture();
    const { doc: grouped } = createHousehold(doc, [guestIds[0], guestIds[1]], "Pair");
    const copy = duplicateEventDoc(grouped, { copyGuests: true });
    expect(copy.households).toHaveLength(1);
    expect(copy.households[0]).toMatchObject({ name: "Pair" });
    expect(copy.households[0].id).not.toBe(grouped.households[0].id);
    expect(copy.guests.filter((g) => g.householdId === copy.households[0].id)).toHaveLength(2);
    expect(eventDocSchema.safeParse(copy).success).toBe(true);
    expect(duplicateEventDoc(grouped).households).toEqual([]);
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

describe("exact seat placement setting", () => {
  it("defaults to auto: on for 2 or fewer tables", () => {
    const { doc } = fixture(); // one table
    expect(doc.settings.exactSeatPlacement).toBe("auto");
    expect(isExactSeatPlacement(doc)).toBe(true);
    const two = addTable(doc, { shape: "round", position: { x: 0, y: 0 } }).doc;
    expect(isExactSeatPlacement(two)).toBe(true);
    const three = addTable(two, { shape: "round", position: { x: 0, y: 0 } }).doc;
    expect(isExactSeatPlacement(three)).toBe(false);
  });

  it("follows an explicit on/off regardless of size", () => {
    const { doc } = fixture();
    const off = setExactSeatPlacement(doc, "off");
    expect(isExactSeatPlacement(off)).toBe(false);
    expect(setExactSeatPlacement(off, "off")).toBe(off);
    const big = addTable(
      addTable(addTable(doc, { shape: "round", position: { x: 0, y: 0 } }).doc, {
        shape: "round",
        position: { x: 0, y: 0 },
      }).doc,
      { shape: "round", position: { x: 0, y: 0 } },
    ).doc;
    expect(isExactSeatPlacement(setExactSeatPlacement(big, "on"))).toBe(true);
    expect(eventDocSchema.safeParse(off).success).toBe(true);
  });
});

describe("restoreEventDoc", () => {
  it("brings back an old version's content under the current identity", () => {
    const { doc } = fixture();
    const old = {
      ...renameEventDoc(doc, "Old name"),
      id: "other-id",
      createdAt: "2020-01-01T00:00:00.000Z",
    };
    const current = { ...doc, guests: [], updatedAt: "2026-05-05T00:00:00.000Z" };
    const restored = restoreEventDoc(current, old);
    expect(restored).toMatchObject({
      id: doc.id,
      createdAt: doc.createdAt,
      updatedAt: current.updatedAt,
      name: "Old name",
    });
    expect(restored.guests).toHaveLength(3);
    expect(eventDocSchema.safeParse(restored).success).toBe(true);
  });
});
