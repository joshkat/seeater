import type { EventDoc } from "./schema.js";

/**
 * Day-of check-in: marking guests as arrived. Like every op, these return new
 * documents (the same one when nothing changes).
 */

/**
 * Checks guests in at `at` (an ISO timestamp), or out again with `null`.
 * Checking someone in also marks their RSVP as going: they came. Guests
 * already in the requested state keep their original time. Unknown ids are
 * ignored.
 */
export function setCheckedIn(doc: EventDoc, guestIds: string[], at: string | null): EventDoc {
  const ids = new Set(guestIds);
  let changed = false;
  const guests = doc.guests.map((guest) => {
    if (!ids.has(guest.id)) return guest;
    if (at === null) {
      if (guest.checkedInAt === null) return guest;
      changed = true;
      return { ...guest, checkedInAt: null };
    }
    if (guest.checkedInAt !== null && guest.rsvpStatus === "accepted") return guest;
    changed = true;
    return {
      ...guest,
      checkedInAt: guest.checkedInAt ?? at,
      rsvpStatus: "accepted" as const,
    };
  });
  return changed ? { ...doc, guests } : doc;
}

/** Clears every check-in (e.g. after a rehearsal run). */
export function clearCheckIns(doc: EventDoc): EventDoc {
  return setCheckedIn(
    doc,
    doc.guests.filter((guest) => guest.checkedInAt !== null).map((guest) => guest.id),
    null,
  );
}

// ---- Queries (read-only) ----------------------------------------------------

export interface CheckInCounts {
  /** Guests checked in. */
  arrived: number;
  /** Guests expected: everyone who hasn't declined, plus anyone who came anyway. */
  expected: number;
}

export function checkInCounts(doc: EventDoc): CheckInCounts {
  let arrived = 0;
  let expected = 0;
  for (const guest of doc.guests) {
    if (guest.checkedInAt !== null) arrived += 1;
    if (guest.checkedInAt !== null || guest.rsvpStatus !== "declined") expected += 1;
  }
  return { arrived, expected };
}
