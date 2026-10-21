import {
  addGuests,
  addLayout,
  addTable,
  assignSeat,
  createEventDoc,
  createHousehold,
  layoutViews,
  setTableLabel,
  updateGuest,
} from "@seating/shared";
import { describe, expect, it } from "vitest";

import { parseCsvRows, rowsToGuests } from "../../guests/lib/csv";
import { csvCell, exportFileName, guestsCsv } from "../lib/guestsCsv";
import { alphabetical, seatingRows, sortName, tableRosters } from "../lib/seatingRows";

function sample() {
  let doc = createEventDoc({ name: "Ada & Byron's Wedding" });
  doc = addTable(doc, { shape: "round", position: { x: 0, y: 0 }, seatCount: 4 }).doc;
  doc = addTable(doc, { shape: "round", position: { x: 300, y: 0 }, seatCount: 4 }).doc;
  doc = setTableLabel(doc, doc.tables[1].id, "Head table");
  const added = addGuests(doc, [
    { name: "Ada Lovelace", meal: "Fish", tags: ["Family", "VIP"], dietary: "Nuts, peanuts" },
    { name: "Byron Lovelace", meal: "Chicken" },
    { name: "Grace Hopper", notes: 'Says "hi"' },
    { name: "Zed" },
  ]);
  const [ada, byron, grace, zed] = added.guestIds;
  doc = createHousehold(added.doc, [ada, byron], "Lovelace").doc;
  doc = assignSeat(doc, ada, doc.tables[1].seats[0].id);
  doc = assignSeat(doc, byron, doc.tables[1].seats[1].id);
  doc = assignSeat(doc, grace, doc.tables[0].seats[2].id);
  doc = updateGuest(doc, zed, { rsvpStatus: "declined" });
  doc = assignSeat(doc, zed, doc.tables[0].seats[0].id);
  return { doc, ids: { ada, byron, grace, zed } };
}

describe("print lists", () => {
  it("groups rosters by table order and seat, leaving out declined guests", () => {
    const { doc } = sample();
    const rows = seatingRows(doc, layoutViews(doc)[0]);
    const rosters = tableRosters(rows, { includeDeclined: false });
    expect(
      rosters.map((r) => [r.tableName, r.rows.map((row) => `${row.seatNumber} ${row.guest.name}`)]),
    ).toEqual([
      ["Table 1", ["3 Grace Hopper"]],
      ["Head table", ["1 Ada Lovelace", "2 Byron Lovelace"]],
    ]);
    expect(tableRosters(rows, { includeDeclined: true })[0].rows.map((r) => r.guest.name)).toEqual([
      "Zed",
      "Grace Hopper",
    ]);
  });

  it("sorts find-your-seat lists by surname", () => {
    const { doc } = sample();
    const rows = seatingRows(doc, layoutViews(doc)[0]);
    expect(alphabetical(rows, { includeDeclined: false }).map((r) => r.guest.name)).toEqual([
      "Grace Hopper",
      "Ada Lovelace",
      "Byron Lovelace",
    ]);
    expect(sortName("Ada Lovelace")).toBe("Lovelace Ada");
    expect(sortName("Cher")).toBe("Cher");
  });
});

describe("guest CSV", () => {
  it("quotes cells that need it", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });

  it("exports details and seats, and the importer reads the details back", () => {
    const { doc } = sample();
    const csv = guestsCsv(doc);
    const [header, adaLine] = csv.split("\n");
    expect(header).toBe(
      "Name,Email,Phone,RSVP,Household,Meal,Dietary,Accessibility,Tags,Child,Notes,Table,Seat",
    );
    expect(adaLine).toBe(
      'Ada Lovelace,,,Pending,Lovelace,Fish,"Nuts, peanuts",,Family; VIP,,,Head table,1',
    );

    const reimported = rowsToGuests(parseCsvRows(csv)).guests;
    expect(reimported[0]).toMatchObject({
      name: "Ada Lovelace",
      household: "Lovelace",
      meal: "Fish",
      dietary: "Nuts, peanuts",
      tags: ["Family", "VIP"],
    });
    expect(reimported[2]).toMatchObject({ name: "Grace Hopper", notes: 'Says "hi"' });
  });

  it("adds a table and seat column per layout", () => {
    const { doc } = sample();
    const two = addLayout(doc, "Ceremony", "tables").doc;
    expect(guestsCsv(two).split("\n")[0]).toContain(
      "Table (Main),Seat (Main),Table (Ceremony),Seat (Ceremony)",
    );
  });

  it("makes file names safe", () => {
    expect(exportFileName("Ada & Byron's Wedding", "guests.csv")).toBe(
      "Ada-Byrons-Wedding-guests.csv",
    );
    expect(exportFileName("  ", "x.png")).toBe("event-x.png");
  });
});
