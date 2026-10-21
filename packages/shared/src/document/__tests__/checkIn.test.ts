import { describe, expect, it } from "vitest";

import { checkInCounts, clearCheckIns, setCheckedIn } from "../checkInOps.js";
import { duplicateEventDoc } from "../eventOps.js";
import { updateGuest } from "../guestOps.js";
import { parseEventDoc } from "../migrate.js";
import { eventDocSchema } from "../schema.js";
import { fixture } from "./fixture.js";

const NINE = "2026-06-01T19:00:00.000Z";
const TEN = "2026-06-01T20:00:00.000Z";

describe("setCheckedIn", () => {
  it("checks guests in and marks them as going", () => {
    const { doc, guestIds } = fixture();
    const declined = updateGuest(doc, guestIds[1], { rsvpStatus: "declined" });
    const next = setCheckedIn(declined, [guestIds[0], guestIds[1], "nope"], NINE);
    expect(next.guests.map((g) => [g.checkedInAt, g.rsvpStatus])).toEqual([
      [NINE, "accepted"],
      [NINE, "accepted"],
      [null, "pending"],
    ]);
    expect(eventDocSchema.safeParse(next).success).toBe(true);
  });

  it("keeps the first arrival time and is a no-op when nothing changes", () => {
    const { doc, guestIds } = fixture();
    const once = setCheckedIn(doc, [guestIds[0]], NINE);
    expect(setCheckedIn(once, [guestIds[0]], TEN)).toBe(once);
    expect(setCheckedIn(doc, [guestIds[0]], null)).toBe(doc);
  });

  it("checks guests out again, keeping their RSVP", () => {
    const { doc, guestIds } = fixture();
    const inside = setCheckedIn(doc, guestIds, NINE);
    const out = setCheckedIn(inside, [guestIds[0]], null);
    expect(out.guests[0]).toMatchObject({ checkedInAt: null, rsvpStatus: "accepted" });
    expect(clearCheckIns(out).guests.every((g) => g.checkedInAt === null)).toBe(true);
  });
});

describe("checkInCounts", () => {
  it("expects everyone who hasn't declined, plus declined guests who came", () => {
    const { doc, guestIds } = fixture();
    const declined = updateGuest(doc, guestIds[2], { rsvpStatus: "declined" });
    expect(checkInCounts(declined)).toEqual({ arrived: 0, expected: 2 });
    const inside = setCheckedIn(declined, [guestIds[0]], NINE);
    expect(checkInCounts(inside)).toEqual({ arrived: 1, expected: 2 });
  });
});

describe("check-in and other ops", () => {
  it("duplicating an event clears check-ins", () => {
    const { doc, guestIds } = fixture();
    const inside = setCheckedIn(doc, guestIds, NINE);
    const copy = duplicateEventDoc(inside, { copyGuests: true });
    expect(copy.guests.every((g) => g.checkedInAt === null)).toBe(true);
  });

  it("upgrades a v8 document: nobody has arrived", () => {
    const { doc } = fixture();
    const v8 = JSON.parse(JSON.stringify(doc));
    v8.schemaVersion = 8;
    for (const guest of v8.guests) delete guest.checkedInAt;
    expect(parseEventDoc(v8)).toEqual(doc);
  });
});
