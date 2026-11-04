import {
  addGuests,
  addTable,
  assignSeat,
  createEventDoc,
  layoutViews,
  updateGuest,
} from "@seating/shared";
import { describe, expect, it } from "vitest";

import { chartScene } from "../../export/lib/chartScene";
import { findSeats, foldText, tableArea } from "../lib/findSeat";

function seatedDoc() {
  let doc = createEventDoc({ name: "Dinner" });
  doc = addTable(doc, { shape: "round", position: { x: 400, y: 300 }, seatCount: 4 }).doc;
  doc = addTable(doc, { shape: "round", position: { x: 900, y: 300 }, seatCount: 4 }).doc;
  const added = addGuests(doc, [
    { name: "Ada Lovelace" },
    { name: "José Lovelace" },
    { name: "Grace Hopper" },
    { name: "Zed Lovelace" },
  ]);
  const [ada, jose, grace, zed] = added.guestIds;
  doc = assignSeat(added.doc, ada, doc.tables[1].seats[2].id);
  doc = assignSeat(doc, grace, doc.tables[0].seats[0].id);
  doc = updateGuest(doc, zed, { rsvpStatus: "declined" });
  doc = assignSeat(doc, zed, doc.tables[0].seats[1].id);
  return { doc, ada, jose };
}

describe("foldText", () => {
  it("drops case and accents", () => {
    expect(foldText("José ÅSTRÖM")).toBe("jose astrom");
  });
});

describe("findSeats", () => {
  const { doc, ada, jose } = seatedDoc();
  const view = layoutViews(doc)[0];

  it("finds guests by every word of their name, with table and seat", () => {
    const [match] = findSeats(doc, view, "  ada  love ");
    expect(match.guest.id).toBe(ada);
    expect(match.tableName).toBe("Table 2");
    expect(match.seatNumber).toBe(3);
    expect(match.tableId).toBe(doc.tables[1].id);
    expect(match.seatId).toBe(doc.tables[1].seats[2].id);
  });

  it("ignores accents, sorts by surname and leaves declined guests out", () => {
    const matches = findSeats(doc, view, "lovelace");
    expect(matches.map((match) => match.guest.name)).toEqual(["Ada Lovelace", "José Lovelace"]);
    expect(findSeats(doc, view, "jose").map((match) => match.guest.id)).toEqual([jose]);
  });

  it("returns unseated guests without a place, and nothing for an empty query", () => {
    const [unseated] = findSeats(doc, view, "josé");
    expect(unseated.tableId).toBeNull();
    expect(unseated.seatId).toBeNull();
    expect(unseated.tableName).toBeNull();
    expect(findSeats(doc, view, "   ")).toEqual([]);
  });
});

describe("tableArea", () => {
  it("covers the table and its chairs only", () => {
    const { doc } = seatedDoc();
    const view = layoutViews(doc)[0];
    const scene = chartScene(doc, view, {
      showNames: false,
      color: "none",
      includeDeclined: false,
    });
    const area = tableArea(scene, view, doc.tables[0].id)!;
    expect(area.x + area.width / 2).toBeCloseTo(400, 0);
    expect(area.y + area.height / 2).toBeCloseTo(300, 0);
    expect(area.x + area.width).toBeLessThan(900);
    for (const chair of scene.chairs.slice(0, 4)) {
      expect(chair.center.x).toBeGreaterThan(area.x);
      expect(chair.center.x).toBeLessThan(area.x + area.width);
    }
    expect(tableArea(scene, view, "nope")).toBeNull();
  });
});
