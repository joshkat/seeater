import { describe, expect, it } from "vitest";

import { duplicateEventDoc } from "../eventOps.js";
import { assignSeat, removeGuest } from "../guestOps.js";
import { addLayout, deleteLayout, layoutViews, renameLayout, switchLayout } from "../layoutOps.js";
import { eventDocSchema } from "../schema.js";
import { addTable } from "../tableOps.js";
import { fixture, seatIdsOf, seatOf } from "./fixture.js";

/** Fixture with Ada seated at the (only) table of the first layout. */
function seated() {
  const { doc, tableId, guestIds } = fixture();
  const seat = seatIdsOf(doc, tableId)[0];
  return { doc: assignSeat(doc, guestIds[0], seat), tableId, guestIds, seat };
}

const valid = (doc: unknown) => expect(eventDocSchema.safeParse(doc).success).toBe(true);

describe("layouts", () => {
  it("a new event has one active layout", () => {
    const { doc } = fixture();
    expect(doc.layouts).toEqual([{ id: doc.activeLayoutId, name: "Main", stored: null }]);
    valid(doc);
  });

  it("adds a blank layout, switches to it, and switches back with seating intact", () => {
    const { doc, guestIds, seat } = seated();
    const main = doc.activeLayoutId;
    const { doc: withCeremony, layoutId } = addLayout(doc, " Ceremony ");
    expect(withCeremony.activeLayoutId).toBe(layoutId);
    expect(withCeremony.tables).toEqual([]);
    expect(seatOf(withCeremony, guestIds[0])).toBeNull();
    expect(withCeremony.layouts.map((l) => l.name)).toEqual(["Main", "Ceremony"]);
    valid(withCeremony);

    const back = switchLayout(withCeremony, main);
    expect(back.tables).toHaveLength(1);
    expect(seatOf(back, guestIds[0])).toBe(seat);
    valid(back);
  });

  it("copies tables (fresh ids) with or without seating", () => {
    const { doc, guestIds } = seated();
    const tablesOnly = addLayout(doc, "Copy", "tables").doc;
    expect(tablesOnly.tables).toHaveLength(1);
    expect(tablesOnly.tables[0].id).not.toBe(doc.tables[0].id);
    expect(seatOf(tablesOnly, guestIds[0])).toBeNull();
    valid(tablesOnly);

    const withSeating = addLayout(doc, "Copy", "tables-and-seating").doc;
    expect(seatOf(withSeating, guestIds[0])).toBe(withSeating.tables[0].seats[0].id);
    valid(withSeating);
  });

  it("keeps each layout's edits separate", () => {
    const { doc } = seated();
    const main = doc.activeLayoutId;
    const { doc: second } = addLayout(doc, "Reception");
    const withTable = addTable(second, { shape: "rectangle", position: { x: 1, y: 1 } }).doc;
    const backToMain = switchLayout(withTable, main);
    expect(backToMain.tables.map((t) => t.shape)).toEqual(["round"]);
    const views = layoutViews(backToMain);
    expect(views.map((v) => [v.name, v.active, v.tables.length])).toEqual([
      ["Main", true, 1],
      ["Reception", false, 1],
    ]);
  });

  it("renames, and deletes (never the last; the active one hands over)", () => {
    const { doc } = seated();
    const main = doc.activeLayoutId;
    expect(deleteLayout(doc, main)).toBe(doc);
    const { doc: two, layoutId } = addLayout(doc, "Second");
    expect(renameLayout(two, layoutId!, "  ").layouts[1].name).toBe("Second");
    expect(renameLayout(two, layoutId!, "After party").layouts[1].name).toBe("After party");

    const deletedActive = deleteLayout(two, layoutId!);
    expect(deletedActive.activeLayoutId).toBe(main);
    expect(deletedActive.layouts).toHaveLength(1);
    expect(deletedActive.tables).toHaveLength(1);
    valid(deletedActive);
  });

  it("deleting a guest removes them from every layout", () => {
    const { doc, guestIds } = seated();
    const { doc: copy } = addLayout(doc, "Copy", "tables-and-seating");
    const removed = removeGuest(copy, guestIds[0]);
    expect(removed.layouts.every((l) => !l.stored || !(guestIds[0] in l.stored.seating))).toBe(
      true,
    );
    valid(removed);
  });

  it("duplicating an event remaps stored layouts", () => {
    const { doc, guestIds } = seated();
    const { doc: two } = addLayout(doc, "Copy", "tables-and-seating");
    const back = switchLayout(two, doc.activeLayoutId);
    const copy = duplicateEventDoc(back, { copyGuests: true, copyAssignments: true });
    valid(copy);
    const stored = copy.layouts.find((l) => l.stored)!.stored!;
    expect(Object.keys(stored.seating)).toHaveLength(1);
    expect(Object.keys(stored.seating)[0]).not.toBe(guestIds[0]);
    const layoutOnly = duplicateEventDoc(back);
    expect(layoutOnly.layouts.find((l) => l.stored)!.stored!.seating).toEqual({});
    valid(layoutOnly);
  });

  it("rejects inconsistent layouts", () => {
    const { doc } = seated();
    const { doc: two } = addLayout(doc, "Second", "tables-and-seating");
    const stored = two.layouts[0].stored!;
    expect(
      eventDocSchema.safeParse({
        ...two,
        layouts: [
          { ...two.layouts[0], stored: { ...stored, seating: { ghost: "nope" } } },
          two.layouts[1],
        ],
      }).success,
    ).toBe(false);
    expect(eventDocSchema.safeParse({ ...two, activeLayoutId: "missing" }).success).toBe(false);
  });
});
