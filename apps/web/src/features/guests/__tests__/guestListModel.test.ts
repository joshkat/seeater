import { addGuests, createEventDoc, createHousehold, updateGuest } from "@seating/shared";
import { describe, expect, it } from "vitest";

import {
  buildUnassignedEntries,
  nextUnassignedBatch,
  unassignedOrder,
} from "../lib/guestListModel";

function sample() {
  const added = addGuests(createEventDoc({ name: "Test" }), [
    { name: "Zed" },
    { name: "Ada Lovelace", household: "Lovelace" },
    { name: "Byron Lovelace", household: "Lovelace" },
    { name: "Mia" },
  ]);
  return { doc: added.doc, ids: added.guestIds };
}

describe("buildUnassignedEntries", () => {
  it("groups household members under one entry, sorted by name", () => {
    const { doc, ids } = sample();
    const entries = buildUnassignedEntries(doc.guests, doc.households);
    expect(entries.map((e) => (e.kind === "guest" ? e.guest.name : e.household.name))).toEqual([
      "Lovelace",
      "Mia",
      "Zed",
    ]);
    const household = entries[0];
    expect(household.kind === "household" && household.members.map((m) => m.id)).toEqual([
      ids[1],
      ids[2],
    ]);
    expect(unassignedOrder(entries)).toEqual([ids[1], ids[2], ids[3], ids[0]]);
  });

  it("keeps every member id on the header even when some are seated", () => {
    const { doc, ids } = sample();
    const seatedDoc = {
      ...doc,
      guests: doc.guests.map((g) => (g.id === ids[1] ? { ...g, seatId: "s1" } : g)),
    };
    const [entry] = buildUnassignedEntries(seatedDoc.guests, seatedDoc.households);
    expect(entry.kind === "household" && entry.members.map((m) => m.id)).toEqual([ids[2]]);
    expect(entry.kind === "household" && entry.allMemberIds).toEqual([ids[1], ids[2]]);
  });

  it("drops a household from the list once all its members are seated", () => {
    const { doc, ids } = sample();
    const { doc: grouped } = createHousehold(doc, [ids[0]], "Solo");
    const seatedDoc = {
      ...grouped,
      guests: grouped.guests.map((g) => (g.id === ids[0] ? { ...g, seatId: "s1" } : g)),
    };
    const names = buildUnassignedEntries(seatedDoc.guests, seatedDoc.households).map((e) =>
      e.kind === "guest" ? e.guest.name : e.household.name,
    );
    expect(names).not.toContain("Solo");
  });
});

describe("nextUnassignedBatch", () => {
  it("takes the next N after the current selection, skipping declined guests", () => {
    const { doc, ids } = sample();
    const declined = updateGuest(doc, ids[3], { rsvpStatus: "declined" });
    const order = [ids[1], ids[2], ids[3], ids[0]];
    expect(nextUnassignedBatch(order, declined.guests, [], 2)).toEqual([ids[1], ids[2]]);
    expect(nextUnassignedBatch(order, declined.guests, [ids[1], ids[2]], 2)).toEqual([ids[0]]);
    // Nothing after the selection: start again from the top.
    expect(nextUnassignedBatch(order, declined.guests, [ids[0]], 2)).toEqual([ids[1], ids[2]]);
  });
});
