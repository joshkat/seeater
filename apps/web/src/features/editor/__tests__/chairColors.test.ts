import { addGuests, createEventDoc, updateGuest } from "@seating/shared";
import { describe, expect, it } from "vitest";

import { categoryColors, chairColor, legendFor } from "../lib/chairColors";

function guests() {
  const added = addGuests(createEventDoc({ name: "x" }), [
    { name: "Ada", meal: "Fish", tags: ["Family"] },
    { name: "Bob", meal: "Chicken", tags: ["Work", "Family"] },
    { name: "Cy" },
  ]);
  return updateGuest(added.doc, added.guestIds[2], { rsvpStatus: "declined" }).guests;
}

describe("chair colours", () => {
  it("colours by meal with a stable, collision-free palette and a 'none' grey", () => {
    const list = guests();
    const colors = categoryColors(list, "meal");
    const [ada, bob, cy] = list;
    expect(chairColor(ada, "meal", colors)).not.toBe(chairColor(bob, "meal", colors));
    expect(chairColor(cy, "meal", colors)).toBe("#94a3b8");
    expect(legendFor(list, "meal").map((entry) => entry.label)).toEqual([
      "Chicken",
      "Fish",
      "No meal",
    ]);
  });

  it("uses the first tag, fixed RSVP colours, and per-guest colours in guest mode", () => {
    const list = guests();
    const [ada, bob, cy] = list;
    const tagColors = categoryColors(list, "tag");
    expect(chairColor(ada, "tag", tagColors)).toBe(tagColors.get("Family"));
    expect(chairColor(bob, "tag", tagColors)).toBe(tagColors.get("Work"));
    expect(chairColor(cy, "rsvp", categoryColors(list, "rsvp"))).toBe("#dc2626");
    expect(legendFor(list, "rsvp").map((entry) => entry.label)).toEqual(["Pending", "Declined"]);
    expect(legendFor(list, "guest")).toEqual([]);
  });
});
