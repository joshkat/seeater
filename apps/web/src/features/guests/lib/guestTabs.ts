import type { Guest } from "@seating/shared";

/** The guest panel's tabs: who still needs a seat, who has one, or everyone. */
export type GuestTab = "toSeat" | "seated" | "all";

export const GUEST_TABS: { tab: GuestTab; label: string }[] = [
  { tab: "toSeat", label: "To seat" },
  { tab: "seated", label: "Seated" },
  { tab: "all", label: "All" },
];

/** Without a seat because they aren't coming: listed (struck through) under
 * "To seat", but not counted there. */
export function isDeclinedUnseated(guest: Guest): boolean {
  return !guest.seatId && guest.rsvpStatus === "declined";
}

/** The number on each tab. "To seat" leaves out declined guests, who don't
 * need a chair, so it reaches 0 when the work is done. */
export function guestTabCounts(guests: Guest[]): Record<GuestTab, number> {
  let toSeat = 0;
  let seated = 0;
  for (const guest of guests) {
    if (guest.seatId) seated += 1;
    else if (guest.rsvpStatus !== "declined") toSeat += 1;
  }
  return { toSeat, seated, all: guests.length };
}

/**
 * The tab to show. While a search is typed the list shows every match (seated
 * or not), so a guest is never "missing" because the wrong tab is open.
 */
export function effectiveTab(tab: GuestTab, query: string): GuestTab {
  return query.trim() === "" ? tab : "all";
}
