import { describe, expect, it } from "vitest";

import { autoSeat } from "../autoSeat.js";
import { createEventDoc, duplicateEventDoc } from "../eventOps.js";
import { addGuests, assignSeat, removeGuest, swapSeats, updateGuest } from "../guestOps.js";
import { createHousehold } from "../householdOps.js";
import {
  addRule,
  contradictoryPairs,
  newRuleProblems,
  removeRule,
  ruleProblems,
} from "../ruleOps.js";
import { eventDocSchema } from "../schema.js";
import { addTable } from "../tableOps.js";

/** Two 4-seat tables and six guests A..F, nobody seated. */
function setup() {
  let doc = createEventDoc({ name: "x" });
  doc = addTable(doc, { shape: "round", position: { x: 0, y: 0 }, seatCount: 4 }).doc;
  doc = addTable(doc, { shape: "round", position: { x: 400, y: 0 }, seatCount: 4 }).doc;
  const added = addGuests(
    doc,
    ["A", "B", "C", "D", "E", "F"].map((name) => ({ name })),
  );
  const [a, b, c, d, e, f] = added.guestIds;
  return { doc: added.doc, ids: { a, b, c, d, e, f } };
}

const tableOf = (doc: ReturnType<typeof setup>["doc"], guestId: string) =>
  doc.tables.find((t) =>
    t.seats.some((s) => s.id === doc.guests.find((g) => g.id === guestId)?.seatId),
  )?.id;

describe("seating rules", () => {
  it("adds (known guests, at least two), removes, and survives guest deletion", () => {
    const { doc, ids } = setup();
    expect(addRule(doc, "apart", [ids.a, "ghost"]).ruleId).toBeNull();
    const { doc: ruled, ruleId } = addRule(doc, "apart", [ids.a, ids.b, ids.a]);
    expect(ruled.rules[0]).toMatchObject({ kind: "apart", guestIds: [ids.a, ids.b] });
    expect(eventDocSchema.safeParse(ruled).success).toBe(true);
    expect(removeGuest(ruled, ids.a).rules).toEqual([]);
    expect(removeRule(ruled, ruleId!).rules).toEqual([]);
  });

  it("reports apart guests sharing a table and together guests split up", () => {
    const { doc, ids } = setup();
    let next = addRule(doc, "apart", [ids.a, ids.b]).doc;
    next = addRule(next, "together", [ids.c, ids.d]).doc;
    const [t1, t2] = next.tables;
    next = assignSeat(next, ids.a, t1.seats[0].id);
    next = assignSeat(next, ids.b, t1.seats[1].id);
    next = assignSeat(next, ids.c, t1.seats[2].id);
    next = assignSeat(next, ids.d, t2.seats[0].id);
    const problems = ruleProblems(next);
    expect(problems.map((p) => [p.kind, p.guestIds.length, p.tableIds.length])).toEqual([
      ["apart", 2, 1],
      ["together", 2, 2],
    ]);
  });

  it("finds contradictions and new problems after a move", () => {
    const { doc, ids } = setup();
    let next = addRule(doc, "together", [ids.a, ids.b, ids.c]).doc;
    next = addRule(next, "apart", [ids.b, ids.c]).doc;
    expect(contradictoryPairs(next)).toHaveLength(1);
    const before = assignSeat(next, ids.b, next.tables[0].seats[0].id);
    const after = assignSeat(before, ids.c, before.tables[0].seats[1].id);
    expect(newRuleProblems(before, after).map((p) => p.kind)).toEqual(["apart"]);
  });

  it("copies rules with duplicated guests", () => {
    const { doc, ids } = setup();
    const next = addRule(doc, "apart", [ids.a, ids.b]).doc;
    const copy = duplicateEventDoc(next, { copyGuests: true });
    expect(eventDocSchema.safeParse(copy).success).toBe(true);
    expect(copy.rules[0].guestIds).not.toContain(ids.a);
    expect(duplicateEventDoc(next).rules).toEqual([]);
  });
});

describe("swapSeats", () => {
  it("swaps two guests, including with someone unseated", () => {
    const { doc, ids } = setup();
    const [t1] = doc.tables;
    let next = assignSeat(doc, ids.a, t1.seats[0].id);
    next = assignSeat(next, ids.b, t1.seats[1].id);
    const swapped = swapSeats(next, ids.a, ids.b);
    expect(swapped.guests.find((g) => g.id === ids.a)?.seatId).toBe(t1.seats[1].id);
    const withC = swapSeats(swapped, ids.a, ids.c);
    expect(withC.guests.find((g) => g.id === ids.c)?.seatId).toBe(t1.seats[1].id);
    expect(withC.guests.find((g) => g.id === ids.a)?.seatId).toBeNull();
    expect(swapSeats(doc, ids.c, ids.d)).toBe(doc);
  });
});

describe("autoSeat", () => {
  it("seats everyone it can, keeping households whole and apart guests apart", () => {
    const { doc, ids } = setup();
    let next = createHousehold(doc, [ids.a, ids.b, ids.c]).doc;
    next = addRule(next, "apart", [ids.a, ids.d]).doc;
    const result = autoSeat(next);
    expect(result.unplacedIds).toEqual([]);
    expect(result.seatedIds).toHaveLength(6);
    const t = (id: string) => tableOf(result.doc, id);
    expect(new Set([t(ids.a), t(ids.b), t(ids.c)]).size).toBe(1);
    expect(t(ids.d)).not.toBe(t(ids.a));
    expect(eventDocSchema.safeParse(result.doc).success).toBe(true);
  });

  it("keeps 'together' rules at one table and skips declined guests", () => {
    const { doc, ids } = setup();
    let next = addRule(doc, "together", [ids.a, ids.f]).doc;
    next = updateGuest(next, ids.e, { rsvpStatus: "declined" });
    const result = autoSeat(next);
    expect(tableOf(result.doc, ids.a)).toBe(tableOf(result.doc, ids.f));
    expect(result.seatedIds).not.toContain(ids.e);
  });

  it("groups by tag when asked", () => {
    const { doc, ids } = setup();
    let next = doc;
    for (const id of [ids.a, ids.c, ids.e]) next = updateGuest(next, id, { tags: ["Work"] });
    for (const id of [ids.b, ids.d, ids.f]) next = updateGuest(next, id, { tags: ["Family"] });
    const result = autoSeat(next, { groupByTag: true });
    const t = (id: string) => tableOf(result.doc, id);
    expect(new Set([t(ids.a), t(ids.c), t(ids.e)]).size).toBe(1);
    expect(new Set([t(ids.b), t(ids.d), t(ids.f)]).size).toBe(1);
  });

  it("reports groups no table has room for", () => {
    const { doc, ids } = setup();
    const big = createHousehold(doc, [ids.a, ids.b, ids.c, ids.d, ids.e]).doc;
    const result = autoSeat(big);
    expect(result.unplacedIds).toHaveLength(5);
    expect(result.seatedIds).toEqual([ids.f]);
  });
});
