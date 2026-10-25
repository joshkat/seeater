import { describe, expect, it } from "vitest";

import { addGuests, assignSeat, removeGuest } from "../guestOps.js";
import {
  createHousehold,
  defaultHouseholdName,
  dissolveHousehold,
  expandToHouseholds,
  householdMembers,
  householdSplits,
  removeFromHousehold,
  renameHousehold,
  swapSplits,
} from "../householdOps.js";
import { eventDocSchema } from "../schema.js";
import { addTable } from "../tableOps.js";
import { fixture, seatIdsOf } from "./fixture.js";

describe("defaultHouseholdName", () => {
  it("uses a shared surname", () => {
    expect(defaultHouseholdName(["Ada Lovelace", "Byron lovelace"])).toBe("Lovelace household");
  });

  it("falls back to first names", () => {
    expect(defaultHouseholdName(["Ada Lovelace"])).toBe("Lovelace household");
    expect(defaultHouseholdName(["Ada"])).toBe("Ada's household");
    expect(defaultHouseholdName(["Ada", "Grace Hopper"])).toBe("Ada & Grace");
    expect(defaultHouseholdName(["Ada", "Grace", "Linus", "Alan"])).toBe("Ada, Grace & 2 more");
  });
});

describe("createHousehold", () => {
  it("groups guests under a new, named household", () => {
    const { doc, guestIds } = fixture();
    const result = createHousehold(doc, [guestIds[0], guestIds[1]], "  The   Pioneers ");
    expect(result.doc.households).toEqual([{ id: result.householdId, name: "The Pioneers" }]);
    expect(householdMembers(result.doc, result.householdId!).map((g) => g.name)).toEqual([
      "Ada",
      "Grace",
    ]);
    expect(eventDocSchema.safeParse(result.doc).success).toBe(true);
  });

  it("defaults the name and moves members out of old households (dropping empties)", () => {
    const { doc, guestIds } = fixture();
    const first = createHousehold(doc, [guestIds[0]], "Old");
    const second = createHousehold(first.doc, [guestIds[0], guestIds[1]]);
    expect(second.doc.households.map((h) => h.name)).toEqual(["Ada & Grace"]);
    expect(eventDocSchema.safeParse(second.doc).success).toBe(true);
  });

  it("ignores unknown guests", () => {
    const { doc } = fixture();
    expect(createHousehold(doc, ["nope"])).toEqual({ doc, householdId: null });
  });
});

describe("renameHousehold / removeFromHousehold / dissolveHousehold", () => {
  it("renames, ignoring blanks", () => {
    const { doc, guestIds } = fixture();
    const { doc: grouped, householdId } = createHousehold(doc, guestIds, "A");
    expect(renameHousehold(grouped, householdId!, "  ")).toBe(grouped);
    expect(renameHousehold(grouped, householdId!, "B").households[0].name).toBe("B");
  });

  it("removes members and drops the household once empty", () => {
    const { doc, guestIds } = fixture();
    const { doc: grouped, householdId } = createHousehold(doc, [guestIds[0], guestIds[1]]);
    const one = removeFromHousehold(grouped, [guestIds[0]]);
    expect(householdMembers(one, householdId!).map((g) => g.id)).toEqual([guestIds[1]]);
    const none = removeFromHousehold(one, [guestIds[1]]);
    expect(none.households).toEqual([]);
    expect(eventDocSchema.safeParse(none).success).toBe(true);
  });

  it("dissolves a household, keeping its guests", () => {
    const { doc, guestIds } = fixture();
    const { doc: grouped, householdId } = createHousehold(doc, guestIds);
    const dissolved = dissolveHousehold(grouped, householdId!);
    expect(dissolved.households).toEqual([]);
    expect(dissolved.guests).toHaveLength(3);
    expect(dissolved.guests.every((g) => g.householdId === null)).toBe(true);
  });

  it("drops the household when its last member is deleted", () => {
    const { doc, guestIds } = fixture();
    const { doc: grouped } = createHousehold(doc, [guestIds[0]]);
    expect(removeGuest(grouped, guestIds[0]).households).toEqual([]);
  });
});

describe("expandToHouseholds", () => {
  it("adds missing members right after the first picked member", () => {
    const { doc, guestIds } = fixture();
    const extra = addGuests(doc, [{ name: "Alan" }]);
    const [ada, grace, linus] = guestIds;
    const alan = extra.guestIds[0];
    const { doc: grouped } = createHousehold(extra.doc, [ada, linus]);
    expect(expandToHouseholds(grouped, [alan, linus, grace])).toEqual([alan, linus, ada, grace]);
  });
});

describe("householdSplits", () => {
  it("flags members left unseated or at another table", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace] = guestIds;
    const { doc: grouped, householdId } = createHousehold(doc, [ada, grace]);

    const splits = householdSplits(grouped, [ada], tableId);
    expect(splits).toHaveLength(1);
    expect(splits[0]).toMatchObject({
      household: { id: householdId },
      movingIds: [ada],
      leftBehindIds: [grace],
    });
  });

  it("is empty when the rest of the household is already at the target table", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace] = guestIds;
    const { doc: grouped } = createHousehold(doc, [ada, grace]);
    const graceSeated = assignSeat(grouped, grace, seatIdsOf(grouped, tableId)[0]);
    expect(householdSplits(graceSeated, [ada], tableId)).toEqual([]);

    const other = addTable(graceSeated, { shape: "round", position: { x: 0, y: 0 } });
    expect(householdSplits(other.doc, [ada], other.tableId)).toHaveLength(1);
  });

  it("is empty when the whole household moves", () => {
    const { doc, tableId, guestIds } = fixture();
    const { doc: grouped } = createHousehold(doc, [guestIds[0], guestIds[1]]);
    expect(householdSplits(grouped, [guestIds[0], guestIds[1]], tableId)).toEqual([]);
  });
});

describe("swapSplits", () => {
  it("flags the household a swap to another table splits", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace, linus] = guestIds;
    const { doc: grouped, householdId } = createHousehold(doc, [ada, grace]);
    const other = addTable(grouped, { shape: "round", position: { x: 0, y: 0 } });
    const here = seatIdsOf(other.doc, tableId);
    const there = seatIdsOf(other.doc, other.tableId);
    let seated = assignSeat(other.doc, ada, here[0]);
    seated = assignSeat(seated, grace, here[1]);
    seated = assignSeat(seated, linus, there[0]);

    const splits = swapSplits(seated, ada, linus);
    expect(splits).toHaveLength(1);
    expect(splits[0]).toMatchObject({
      household: { id: householdId },
      movingIds: [ada],
      leftBehindIds: [grace],
    });
  });

  it("is empty for a swap within one table or between household members", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace, linus] = guestIds;
    const { doc: grouped } = createHousehold(doc, [ada, grace]);
    const here = seatIdsOf(grouped, tableId);
    const seated = assignSeat(assignSeat(grouped, ada, here[0]), linus, here[2]);
    expect(swapSplits(seated, ada, linus)).toEqual([]);
    expect(swapSplits(seated, ada, grace)).toEqual([]);
  });

  it("treats swapping with an unseated guest as leaving the table", () => {
    const { doc, tableId, guestIds } = fixture();
    const [ada, grace, linus] = guestIds;
    const { doc: grouped } = createHousehold(doc, [ada, grace]);
    const here = seatIdsOf(grouped, tableId);
    const seated = assignSeat(assignSeat(grouped, ada, here[0]), grace, here[1]);
    expect(swapSplits(seated, ada, linus)).toMatchObject([
      { movingIds: [ada], leftBehindIds: [grace] },
    ]);
  });
});
