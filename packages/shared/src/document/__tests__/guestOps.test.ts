import { describe, expect, it } from "vitest";

import {
  addGuests,
  assignGuestsToTable,
  assignSeat,
  removeGuest,
  updateGuest,
} from "../guestOps.js";
import { eventDocSchema } from "../schema.js";
import { fixture, seatIdsOf, seatOf } from "./fixture.js";

describe("addGuests", () => {
  it("trims, skips blank names and nulls blank contacts", () => {
    const { doc } = fixture();
    const result = addGuests(doc, [
      { name: "  Alan  ", email: " ", phone: " 555 " },
      { name: "   " },
    ]);
    expect(result.guestIds).toHaveLength(1);
    const alan = result.doc.guests.find((g) => g.id === result.guestIds[0])!;
    expect(alan).toMatchObject({ name: "Alan", email: null, phone: "555", rsvpStatus: "pending" });
  });
});

describe("updateGuest / removeGuest", () => {
  it("updates RSVP and ignores a blank rename", () => {
    const { doc, guestIds } = fixture();
    const updated = updateGuest(doc, guestIds[0], { rsvpStatus: "declined", name: " " });
    expect(updated.guests[0]).toMatchObject({ name: "Ada", rsvpStatus: "declined" });
  });

  it("removes a guest", () => {
    const { doc, guestIds } = fixture();
    expect(removeGuest(doc, guestIds[0]).guests.map((g) => g.id)).not.toContain(guestIds[0]);
  });
});

describe("assignSeat", () => {
  it("displaces the previous occupant", () => {
    const { doc, tableId, guestIds } = fixture();
    const seat = seatIdsOf(doc, tableId)[0];
    const first = assignSeat(doc, guestIds[0], seat);
    const second = assignSeat(first, guestIds[1], seat);
    expect(seatOf(second, guestIds[1])).toBe(seat);
    expect(seatOf(second, guestIds[0])).toBeNull();
    expect(eventDocSchema.safeParse(second).success).toBe(true);
  });

  it("ignores unknown seats and can unseat", () => {
    const { doc, tableId, guestIds } = fixture();
    expect(assignSeat(doc, guestIds[0], "missing")).toBe(doc);
    const seated = assignSeat(doc, guestIds[0], seatIdsOf(doc, tableId)[0]);
    expect(seatOf(assignSeat(seated, guestIds[0], null), guestIds[0])).toBeNull();
  });
});

describe("assignGuestsToTable", () => {
  it("fills open seats and skips seats held by others", () => {
    const { doc, tableId, guestIds } = fixture();
    const seats = seatIdsOf(doc, tableId);
    const withLinus = assignSeat(doc, guestIds[2], seats[0]);
    const result = assignGuestsToTable(withLinus, [guestIds[0], guestIds[1]], tableId);
    expect(result).toMatchObject({ assigned: 2, capacity: 3 });
    expect(seatOf(result.doc, guestIds[2])).toBe(seats[0]);
    expect(seatOf(result.doc, guestIds[0])).toBe(seats[1]);
    expect(seatOf(result.doc, guestIds[1])).toBe(seats[2]);
  });

  it("reports partial seating when the group exceeds capacity", () => {
    const { doc, tableId } = fixture();
    const many = addGuests(
      doc,
      Array.from({ length: 6 }, (_, i) => ({ name: `G${i}` })),
    );
    const result = assignGuestsToTable(many.doc, many.guestIds, tableId);
    expect(result).toMatchObject({ assigned: 4, capacity: 4 });
    expect(eventDocSchema.safeParse(result.doc).success).toBe(true);
  });
});
