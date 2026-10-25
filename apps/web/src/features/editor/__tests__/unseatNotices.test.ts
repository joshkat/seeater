import {
  addGuests,
  addTable,
  assignSeat,
  createEventDoc,
  deleteTables,
  setSeatCount,
} from "@seating/shared";
import { describe, expect, it } from "vitest";

import { chairCutNotice, deletedTablesNotice, nameList } from "../lib/unseatNotices";

function seatedDoc() {
  const base = createEventDoc({ name: "Notices" });
  const table = addTable(base, { shape: "round", position: { x: 400, y: 300 }, seatCount: 4 });
  const guests = addGuests(table.doc, [
    { name: "Ada" },
    { name: "Grace" },
    { name: "Linus" },
    { name: "Alan" },
  ]);
  const seats = guests.doc.tables[0].seats.map((seat) => seat.id);
  const doc = guests.guestIds.reduce(
    (current, id, i) => assignSeat(current, id, seats[i]),
    guests.doc,
  );
  return { doc, tableId: table.tableId };
}

describe("nameList", () => {
  it("joins up to three names, then counts the rest", () => {
    expect(nameList(["Ada"])).toBe("Ada");
    expect(nameList(["Ada", "Grace"])).toBe("Ada and Grace");
    expect(nameList(["Ada", "Grace", "Linus"])).toBe("Ada, Grace and Linus");
    expect(nameList(["Ada", "Grace", "Linus", "Alan", "Edsger"])).toBe(
      "Ada, Grace, Linus and 2 more",
    );
  });
});

describe("unseat notices", () => {
  it("says how many guests a table delete unseated", () => {
    const { doc, tableId } = seatedDoc();
    expect(deletedTablesNotice(doc, deleteTables(doc, [tableId]), [tableId])).toBe(
      "Deleted Table 1. 4 guests are unseated.",
    );
  });

  it("says nothing when a delete unseats nobody", () => {
    const base = createEventDoc({ name: "Empty" });
    const { doc, tableId } = addTable(base, { shape: "round", position: { x: 0, y: 0 } });
    expect(deletedTablesNotice(doc, deleteTables(doc, [tableId]), [tableId])).toBeNull();
  });

  it("names who a chair cut unseated", () => {
    const { doc, tableId } = seatedDoc();
    expect(chairCutNotice(doc, setSeatCount(doc, tableId, 3), tableId)).toBe(
      "Table 1 now has 3 chairs. 1 guest is unseated (Alan).",
    );
    expect(chairCutNotice(doc, setSeatCount(doc, tableId, 6), tableId)).toBeNull();
  });
});
