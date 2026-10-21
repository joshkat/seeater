import { addGuests, assignSeat, createEventDoc, addTable, createHousehold } from "@seating/shared";
import { describe, expect, it } from "vitest";

import { NO_FILTER, activeFilterCount, filterGuests } from "../lib/guestFilter";

function sample() {
  const table = addTable(createEventDoc({ name: "x" }), {
    shape: "round",
    position: { x: 0, y: 0 },
  });
  const added = addGuests(table.doc, [
    { name: "Ada Lovelace", meal: "Fish", tags: ["Family"], dietary: "Nuts" },
    { name: "Grace Hopper", meal: "Chicken", tags: ["Work"], email: "grace@navy.mil" },
    { name: "Tom Thumb", isChild: true, accessibility: "Wheelchair" },
  ]);
  const [ada, grace, tom] = added.guestIds;
  const seated = assignSeat(added.doc, ada, table.doc.tables[0].seats[0].id);
  const grouped = createHousehold(seated, [tom], "Thumb family").doc;
  return { doc: grouped, ada, grace, tom };
}

const names = (guests: { name: string }[]) => guests.map((g) => g.name);

describe("guest filter", () => {
  it("returns everyone with no filter", () => {
    const { doc } = sample();
    expect(filterGuests(doc.guests, doc.households, NO_FILTER)).toBe(doc.guests);
  });

  it("searches name, contact, details, tags and household, all words required", () => {
    const { doc } = sample();
    const search = (query: string) =>
      names(filterGuests(doc.guests, doc.households, { ...NO_FILTER, query }));
    expect(search("hopper")).toEqual(["Grace Hopper"]);
    expect(search("navy")).toEqual(["Grace Hopper"]);
    expect(search("nuts")).toEqual(["Ada Lovelace"]);
    expect(search("family")).toEqual(["Ada Lovelace", "Tom Thumb"]);
    expect(search("thumb wheelchair")).toEqual(["Tom Thumb"]);
  });

  it("filters by RSVP, seating, tag, meal and needs", () => {
    const { doc } = sample();
    const by = (patch: Partial<typeof NO_FILTER>) =>
      names(filterGuests(doc.guests, doc.households, { ...NO_FILTER, ...patch }));
    expect(by({ seating: "seated" })).toEqual(["Ada Lovelace"]);
    expect(by({ seating: "unseated" })).toEqual(["Grace Hopper", "Tom Thumb"]);
    expect(by({ tag: "work" })).toEqual(["Grace Hopper"]);
    expect(by({ meal: "fish" })).toEqual(["Ada Lovelace"]);
    expect(by({ need: "child" })).toEqual(["Tom Thumb"]);
    expect(by({ need: "accessibility" })).toEqual(["Tom Thumb"]);
    expect(by({ rsvp: "declined" })).toEqual([]);
    expect(activeFilterCount({ ...NO_FILTER, tag: "x", need: "child", query: "a" })).toBe(2);
  });
});
