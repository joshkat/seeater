import { describe, expect, it } from "vitest";

import {
  addChairsAndAssign,
  addGuests,
  applySeatPlan,
  assignGuestsToTable,
  assignSeat,
  mealOptions,
  openSeatCount,
  removeGuest,
  tagOptions,
  updateGuest,
} from "../guestOps.js";
import { createHousehold } from "../householdOps.js";
import { eventDocSchema } from "../schema.js";
import { setChairMode } from "../tableOps.js";
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

  it("groups guests by household name, reusing an existing household", () => {
    const { doc, guestIds } = fixture();
    const existing = createHousehold(doc, [guestIds[0]], "Lovelace");
    const result = addGuests(existing.doc, [
      { name: "Byron", household: " lovelace " },
      { name: "Grace H", household: "Hopper" },
      { name: "Walter", household: "HOPPER" },
      { name: "Solo", household: "  " },
    ]);
    const [byron, grace, walter, solo] = result.guestIds.map(
      (id) => result.doc.guests.find((g) => g.id === id)!,
    );
    expect(byron.householdId).toBe(existing.householdId);
    expect(grace.householdId).not.toBeNull();
    expect(walter.householdId).toBe(grace.householdId);
    expect(solo.householdId).toBeNull();
    expect(result.doc.households.map((h) => h.name)).toEqual(["Lovelace", "Hopper"]);
    expect(eventDocSchema.safeParse(result.doc).success).toBe(true);
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
    expect(result.seatedIds).toEqual(many.guestIds.slice(0, 4));
    expect(result.unseatedIds).toEqual(many.guestIds.slice(4));
    expect(eventDocSchema.safeParse(result.doc).success).toBe(true);
  });

  it("keeps a household whole, seating smaller parties after it instead", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace, linus] = guestIds;
    const extra = addGuests(doc, [{ name: "Alan" }, { name: "Edsger" }]);
    const [alan, edsger] = extra.guestIds;
    // Table has 4 seats; Ada is seated, so 3 are open for the rest.
    const seated = assignSeat(extra.doc, ada, seatIdsOf(doc, tableId)[0]);
    const { doc: grouped } = createHousehold(seated, [grace, linus, alan, edsger]);
    const solo = addGuests(grouped, [{ name: "Barbara" }]);
    const barbara = solo.guestIds[0];

    const result = assignGuestsToTable(solo.doc, [grace, linus, alan, edsger, barbara], tableId);
    expect(result.seatedIds).toEqual([barbara]);
    expect(result.unseatedIds).toEqual([grace, linus, alan, edsger]);
    expect(result).toMatchObject({ assigned: 1, capacity: 3 });
  });

  it("seats household members next to each other even when picked apart", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace, linus] = guestIds;
    const { doc: grouped } = createHousehold(doc, [ada, linus]);
    const result = assignGuestsToTable(grouped, [ada, grace, linus], tableId);
    const seats = seatIdsOf(doc, tableId);
    expect(result.seatedIds).toEqual([ada, linus, grace]);
    expect(seatOf(result.doc, linus)).toBe(seats[1]);
  });

  it("splits a household when asked to", () => {
    const { doc, tableId } = fixture();
    const many = addGuests(
      doc,
      Array.from({ length: 6 }, (_, i) => ({ name: `G${i}`, household: "Big" })),
    );
    const whole = assignGuestsToTable(many.doc, many.guestIds, tableId);
    expect(whole.assigned).toBe(0);
    const split = assignGuestsToTable(many.doc, many.guestIds, tableId, { splitHouseholds: true });
    expect(split.seatedIds).toEqual(many.guestIds.slice(0, 4));
    expect(eventDocSchema.safeParse(split.doc).success).toBe(true);
  });

  it("treats unknown tables and guests as nothing to do", () => {
    const { doc, guestIds } = fixture();
    const result = assignGuestsToTable(doc, [guestIds[0], "ghost", guestIds[0]], "missing");
    expect(result).toMatchObject({ doc, assigned: 0, unseatedIds: [guestIds[0]] });
  });
});

describe("openSeatCount", () => {
  it("counts seats held by the group as open", () => {
    const { doc, tableId, guestIds } = fixture();
    const seated = assignSeat(doc, guestIds[0], seatIdsOf(doc, tableId)[0]);
    expect(openSeatCount(seated, tableId)).toBe(3);
    expect(openSeatCount(seated, tableId, [guestIds[0]])).toBe(4);
    expect(openSeatCount(seated, "missing")).toBe(0);
  });
});

describe("addChairsAndAssign", () => {
  it("adds just enough chairs and seats everyone", () => {
    const { doc, tableId } = fixture();
    const many = addGuests(
      doc,
      Array.from({ length: 6 }, (_, i) => ({ name: `G${i}` })),
    );
    const result = addChairsAndAssign(many.doc, many.guestIds, tableId);
    expect(result).toMatchObject({ addedChairs: 2, assigned: 6, unseatedIds: [] });
    expect(result.doc.tables[0].seats).toHaveLength(6);
    expect(eventDocSchema.safeParse(result.doc).success).toBe(true);
  });

  it("keeps existing occupants where they are", () => {
    const { doc, tableId, guestIds } = fixture();
    const seat = seatIdsOf(doc, tableId)[3];
    const seated = assignSeat(doc, guestIds[0], seat);
    const extra = addGuests(
      seated,
      Array.from({ length: 4 }, (_, i) => ({ name: `G${i}` })),
    );
    const result = addChairsAndAssign(extra.doc, extra.guestIds, tableId);
    expect(result.addedChairs).toBe(1);
    expect(seatOf(result.doc, guestIds[0])).toBe(seat);
  });

  it("caps the table at the maximum chair count", () => {
    const { doc, tableId } = fixture();
    const many = addGuests(
      doc,
      Array.from({ length: 70 }, (_, i) => ({ name: `G${i}` })),
    );
    const custom = setChairMode(many.doc, tableId, "custom");
    const result = addChairsAndAssign(custom, many.guestIds, tableId);
    expect(result.doc.tables[0].seats).toHaveLength(64);
    expect(result.unseatedIds).toHaveLength(6);
    expect(eventDocSchema.safeParse(result.doc).success).toBe(true);
  });
});

describe("applySeatPlan", () => {
  it("applies several moves at once, unseating whoever is displaced", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace, linus] = guestIds;
    const seats = seatIdsOf(doc, tableId);
    const start = assignSeat(assignSeat(doc, ada, seats[0]), linus, seats[2]);
    const next = applySeatPlan(start, [
      { guestId: grace, seatId: seats[0] },
      { guestId: ada, seatId: seats[1] },
    ]);
    expect(seatOf(next, grace)).toBe(seats[0]);
    expect(seatOf(next, ada)).toBe(seats[1]);
    expect(seatOf(next, linus)).toBe(seats[2]);
    expect(eventDocSchema.safeParse(next).success).toBe(true);
  });

  it("swaps two seated guests", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace] = guestIds;
    const seats = seatIdsOf(doc, tableId);
    const start = assignSeat(assignSeat(doc, ada, seats[0]), grace, seats[1]);
    const next = applySeatPlan(start, [
      { guestId: ada, seatId: seats[1] },
      { guestId: grace, seatId: seats[0] },
    ]);
    expect(seatOf(next, ada)).toBe(seats[1]);
    expect(seatOf(next, grace)).toBe(seats[0]);
  });

  it("unseats a guest left out of the plan whose seat is taken", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace] = guestIds;
    const seats = seatIdsOf(doc, tableId);
    const start = assignSeat(doc, ada, seats[0]);
    const next = applySeatPlan(start, [{ guestId: grace, seatId: seats[0] }]);
    expect(seatOf(next, ada)).toBeNull();
    expect(eventDocSchema.safeParse(next).success).toBe(true);
  });

  it("lets the later entry win a contested seat, and can unseat", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace, linus] = guestIds;
    const seats = seatIdsOf(doc, tableId);
    const start = assignSeat(doc, linus, seats[3]);
    const next = applySeatPlan(start, [
      { guestId: ada, seatId: seats[0] },
      { guestId: grace, seatId: seats[0] },
      { guestId: linus, seatId: null },
    ]);
    expect(seatOf(next, ada)).toBeNull();
    expect(seatOf(next, grace)).toBe(seats[0]);
    expect(seatOf(next, linus)).toBeNull();
    expect(eventDocSchema.safeParse(next).success).toBe(true);
  });

  it("skips unknown guests and seats and returns the same doc for no-ops", () => {
    const { doc, guestIds } = fixture();
    expect(
      applySeatPlan(doc, [
        { guestId: "ghost", seatId: null },
        { guestId: guestIds[0], seatId: "missing" },
        { guestId: guestIds[1], seatId: null },
      ]),
    ).toBe(doc);
  });
});

describe("guest details", () => {
  it("cleans details on add and matches meals and tags case-insensitively", () => {
    const { doc } = fixture();
    const result = addGuests(doc, [
      {
        name: "Ada",
        meal: "  Chicken ",
        dietary: " nut allergy ",
        tags: ["Bride's side", " family ", "Family", ""],
        isChild: false,
      },
      { name: "Byron", meal: "chicken", tags: ["bride's SIDE"], isChild: true, notes: "  " },
    ]);
    const [ada, byron] = result.guestIds.map((id) => result.doc.guests.find((g) => g.id === id)!);
    expect(ada).toMatchObject({
      meal: "Chicken",
      dietary: "nut allergy",
      tags: ["Bride's side", "family"],
      isChild: false,
    });
    expect(byron).toMatchObject({
      meal: "Chicken",
      tags: ["Bride's side"],
      isChild: true,
      notes: null,
    });
    expect(mealOptions(result.doc)).toEqual(["Chicken"]);
    expect(tagOptions(result.doc)).toEqual(["Bride's side", "family"]);
    expect(eventDocSchema.safeParse(result.doc).success).toBe(true);
  });

  it("updates details, clearing with blanks and leaving untouched fields alone", () => {
    const { doc, guestIds } = fixture();
    const withFish = updateGuest(doc, guestIds[1], { meal: "Fish" });
    const next = updateGuest(withFish, guestIds[0], {
      meal: "FISH",
      accessibility: "Wheelchair",
      tags: ["Work", "work", "Team"],
      isChild: true,
    });
    expect(next.guests[0]).toMatchObject({
      meal: "Fish",
      accessibility: "Wheelchair",
      tags: ["Work", "Team"],
      isChild: true,
      dietary: null,
    });
    const cleared = updateGuest(next, guestIds[0], { meal: " ", tags: [] });
    expect(cleared.guests[0]).toMatchObject({ meal: null, tags: [], accessibility: "Wheelchair" });
    expect(eventDocSchema.safeParse(cleared).success).toBe(true);
  });

  it("caps tags per guest", () => {
    const { doc } = fixture();
    const many = Array.from({ length: 30 }, (_, i) => `Tag ${i}`);
    const result = addGuests(doc, [{ name: "Tagged", tags: many }]);
    expect(result.doc.guests.at(-1)?.tags).toHaveLength(20);
  });
});
