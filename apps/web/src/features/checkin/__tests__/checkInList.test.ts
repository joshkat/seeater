import {
  addGuests,
  addTable,
  assignSeat,
  createEventDoc,
  layoutViews,
  setCheckedIn,
  updateGuest,
} from "@seating/shared";
import { describe, expect, it } from "vitest";

import { checkInList } from "../lib/checkInList";

function event() {
  const base = createEventDoc({ name: "Door", now: "2026-01-01T00:00:00.000Z" });
  const table = addTable(base, { shape: "round", position: { x: 400, y: 300 }, seatCount: 4 });
  const added = addGuests(table.doc, [
    { name: "Ada Lovelace", household: "Lovelace" },
    { name: "Byron Lovelace", household: "Lovelace" },
    { name: "Grace Hopper", tags: ["Navy"] },
    { name: "Alan Turing" },
  ]);
  const [ada, byron, grace, alan] = added.guestIds;
  const seat = table.doc.tables[0].seats[2].id;
  let doc = assignSeat(added.doc, grace, seat);
  doc = updateGuest(doc, alan, { rsvpStatus: "declined" });
  return { doc, ada, byron, grace, alan };
}

const view = (doc: ReturnType<typeof event>["doc"]) => layoutViews(doc)[0];
const names = (rows: { guest: { name: string } }[]) => rows.map((row) => row.guest.name);

describe("checkInList", () => {
  it("sorts by surname, hides declined guests and shows where each sits", () => {
    const { doc } = event();
    const rows = checkInList(doc, view(doc), "", "all");
    expect(names(rows)).toEqual(["Grace Hopper", "Ada Lovelace", "Byron Lovelace"]);
    expect(rows[0]).toMatchObject({ tableName: "Table 1", seatNumber: 3 });
    expect(rows[1]).toMatchObject({ tableName: null, householdName: "Lovelace" });
  });

  it("finds declined guests by search, and matches households and tags", () => {
    const { doc } = event();
    expect(names(checkInList(doc, view(doc), "turing", "all"))).toEqual(["Alan Turing"]);
    expect(names(checkInList(doc, view(doc), "navy", "all"))).toEqual(["Grace Hopper"]);
    expect(names(checkInList(doc, view(doc), "lovelace", "all"))).toHaveLength(2);
  });

  it("filters by arrival and lists household members still to come", () => {
    const { doc, ada, byron } = event();
    const inside = setCheckedIn(doc, [ada], "2026-06-01T19:00:00.000Z");
    expect(names(checkInList(inside, view(inside), "", "arrived"))).toEqual(["Ada Lovelace"]);
    const waiting = checkInList(inside, view(inside), "", "waiting");
    expect(names(waiting)).toEqual(["Grace Hopper", "Byron Lovelace"]);
    expect(waiting[1].partyWaitingIds).toEqual([]);
    expect(checkInList(doc, view(doc), "ada", "all")[0].partyWaitingIds).toEqual([byron]);
  });
});
