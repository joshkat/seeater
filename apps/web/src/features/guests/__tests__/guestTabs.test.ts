import { addGuests, addTable, assignSeat, createEventDoc, updateGuest } from "@seating/shared";
import { describe, expect, it } from "vitest";

import { effectiveTab, guestTabCounts, isDeclinedUnseated } from "../lib/guestTabs";

function sample() {
  const withTable = addTable(createEventDoc({ name: "Test" }), {
    shape: "round",
    position: { x: 300, y: 300 },
  });
  const added = addGuests(withTable.doc, [{ name: "Ada" }, { name: "Grace" }, { name: "Tom" }]);
  const [ada, , tom] = added.guestIds;
  const seatId = added.doc.tables[0].seats[0].id;
  const doc = updateGuest(assignSeat(added.doc, ada, seatId), tom, { rsvpStatus: "declined" });
  return doc.guests;
}

describe("guestTabCounts", () => {
  it("leaves declined guests out of 'To seat'", () => {
    expect(guestTabCounts(sample())).toEqual({ toSeat: 1, seated: 1, all: 3 });
  });

  it("counts a declined guest who still has a seat as seated", () => {
    const guests = sample().map((guest) =>
      guest.name === "Ada" ? { ...guest, rsvpStatus: "declined" as const } : guest,
    );
    expect(guestTabCounts(guests)).toEqual({ toSeat: 1, seated: 1, all: 3 });
  });
});

describe("isDeclinedUnseated", () => {
  it("is only the declined guests without a seat", () => {
    expect(
      sample()
        .filter(isDeclinedUnseated)
        .map((guest) => guest.name),
    ).toEqual(["Tom"]);
  });
});

describe("effectiveTab", () => {
  it("shows everyone while a search is typed", () => {
    expect(effectiveTab("toSeat", "")).toBe("toSeat");
    expect(effectiveTab("toSeat", "  ")).toBe("toSeat");
    expect(effectiveTab("seated", "ada")).toBe("all");
  });
});
