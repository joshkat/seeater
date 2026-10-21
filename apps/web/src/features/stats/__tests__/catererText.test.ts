import {
  addGuests,
  addTable,
  assignSeat,
  createEventDoc,
  layoutStats,
  layoutViews,
} from "@seating/shared";
import { describe, expect, it } from "vitest";

import { catererText } from "../lib/catererText";

describe("catererText", () => {
  it("lists meals per occupied table with children and needs", () => {
    const withTables = addTable(
      addTable(createEventDoc({ name: "Gala" }), { shape: "round", position: { x: 0, y: 0 } }).doc,
      { shape: "round", position: { x: 300, y: 0 } },
    ).doc;
    const added = addGuests(withTables, [
      { name: "Ada", meal: "Fish", dietary: "Nuts" },
      { name: "Tom", meal: "Kids menu", isChild: true },
    ]);
    const seats = added.doc.tables[0].seats;
    let doc = assignSeat(added.doc, added.guestIds[0], seats[0].id);
    doc = assignSeat(doc, added.guestIds[1], seats[1].id);

    expect(catererText(doc.name, layoutStats(doc, layoutViews(doc)[0]))).toBe(
      [
        "Gala — Main",
        "",
        "All tables: Fish 1, Kids menu 1",
        "",
        "Table 1 (2 guests): Fish 1, Kids menu 1",
        "  Children: 1",
        "  Ada: Nuts",
      ].join("\n"),
    );
  });
});
