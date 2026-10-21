import { addGuests, createEventDoc } from "@seating/shared";
import { describe, expect, it } from "vitest";

import { guestSubtitle } from "../lib/guestSubtitle";

function guest(input: Parameters<typeof addGuests>[1][number]) {
  return addGuests(createEventDoc({ name: "x" }), [input]).doc.guests[0];
}

describe("guestSubtitle", () => {
  it("puts the seat first, then details, then contact", () => {
    const ada = guest({
      name: "Ada",
      email: "ada@x.com",
      meal: "Fish",
      dietary: "Nuts",
      accessibility: "Wheelchair",
      isChild: true,
      notes: "Speech",
    });
    expect(guestSubtitle(ada, 3)).toBe("Seat 3 · Fish · ⚠ Nuts · ♿ · Child · 📝 · ada@x.com");
  });

  it("is null when there's nothing to say", () => {
    expect(guestSubtitle(guest({ name: "Plain" }), null)).toBeNull();
  });

  it("flags a broken seating rule first", () => {
    expect(guestSubtitle(guest({ name: "Ada", meal: "Fish" }), 2, true)).toBe(
      "⚠ rule · Seat 2 · Fish",
    );
  });
});
