import type { Guest } from "@seating/shared";

/**
 * The second line under a guest's name: where they sit, then what a planner
 * needs at a glance (meal, dietary needs, accessibility, child), then
 * contact details. Empty parts are skipped.
 */
export function guestSubtitle(guest: Guest, seatNumber: number | null): string | null {
  const parts = [
    seatNumber !== null ? `Seat ${seatNumber}` : null,
    guest.meal,
    guest.dietary ? `⚠ ${guest.dietary}` : null,
    guest.accessibility ? "♿" : null,
    guest.isChild ? "Child" : null,
    guest.notes ? "📝" : null,
    guest.email ?? guest.phone,
  ].filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(" · ") : null;
}
