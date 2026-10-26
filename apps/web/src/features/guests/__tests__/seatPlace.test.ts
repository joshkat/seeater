import { addGuests, addTable, assignSeat, createEventDoc, swapSeats } from "@seating/shared";
import { describe, expect, it } from "vitest";

import { seatPlace, swapNotice } from "../lib/seatPlace";

describe("swapNotice", () => {
  it("says where each guest sits now", () => {
    const base = createEventDoc({ name: "Swap" });
    const head = addTable(base, { shape: "round", position: { x: 0, y: 0 }, seatCount: 2 });
    const named = { ...head.doc, tables: [{ ...head.doc.tables[0], label: "Head table" }] };
    const second = addTable(named, { shape: "round", position: { x: 300, y: 0 }, seatCount: 8 });
    const guests = addGuests(second.doc, [
      { name: "Marie Curie" },
      { name: "Alan Turing" },
      { name: "Ada" },
    ]);
    const [marie, alan, ada] = guests.guestIds;
    const headSeat = second.doc.tables[0].seats[0].id;
    const lastSeat = second.doc.tables[1].seats[7].id;
    const seated = assignSeat(assignSeat(guests.doc, marie, headSeat), alan, lastSeat);

    expect(seatPlace(seated, lastSeat)).toBe("Table 2, seat 8");
    expect(swapNotice(swapSeats(seated, marie, alan), marie, alan)).toBe(
      "Swapped Marie Curie (now Table 2, seat 8) and Alan Turing (now Head table, seat 1).",
    );
    expect(swapNotice(swapSeats(seated, marie, ada), marie, ada)).toBe(
      "Swapped Marie Curie (now unseated) and Ada (now Head table, seat 1).",
    );
  });
});
