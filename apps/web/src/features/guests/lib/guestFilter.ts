import type { Guest, Household, RsvpStatus } from "@seating/shared";

/** The guest list's search box and filters. */
export interface GuestFilter {
  query: string;
  rsvp: RsvpStatus | "any";
  seating: "any" | "seated" | "unseated";
  tag: string | null;
  meal: string | null;
  /** Only guests with dietary needs, accessibility needs, or children. */
  need: "any" | "dietary" | "accessibility" | "child";
}

export const NO_FILTER: GuestFilter = {
  query: "",
  rsvp: "any",
  seating: "any",
  tag: null,
  meal: null,
  need: "any",
};

/** How many filters (besides the search text) are set. */
export function activeFilterCount(filter: GuestFilter): number {
  return [
    filter.rsvp !== "any",
    filter.seating !== "any",
    filter.tag !== null,
    filter.meal !== null,
    filter.need !== "any",
  ].filter(Boolean).length;
}

export function isFiltering(filter: GuestFilter): boolean {
  return filter.query.trim() !== "" || activeFilterCount(filter) > 0;
}

/**
 * Whether a guest matches. The search text matches (case-insensitively) the
 * name, contact details, meal, needs, notes, tags and household name.
 */
export function matchesFilter(
  guest: Guest,
  filter: GuestFilter,
  householdName: (id: string) => string | undefined,
): boolean {
  if (filter.rsvp !== "any" && guest.rsvpStatus !== filter.rsvp) return false;
  if (filter.seating === "seated" && !guest.seatId) return false;
  if (filter.seating === "unseated" && guest.seatId) return false;
  if (filter.tag && !guest.tags.some((tag) => tag.toLowerCase() === filter.tag!.toLowerCase())) {
    return false;
  }
  if (filter.meal && (guest.meal ?? "").toLowerCase() !== filter.meal.toLowerCase()) return false;
  if (filter.need === "dietary" && !guest.dietary) return false;
  if (filter.need === "accessibility" && !guest.accessibility) return false;
  if (filter.need === "child" && !guest.isChild) return false;

  const query = filter.query.trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    guest.name,
    guest.email,
    guest.phone,
    guest.meal,
    guest.dietary,
    guest.accessibility,
    guest.notes,
    ...guest.tags,
    guest.householdId ? householdName(guest.householdId) : undefined,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

/** The guests matching a filter, in their original order. */
export function filterGuests(
  guests: Guest[],
  households: Household[],
  filter: GuestFilter,
): Guest[] {
  if (!isFiltering(filter)) return guests;
  const names = new Map(households.map((household) => [household.id, household.name]));
  return guests.filter((guest) => matchesFilter(guest, filter, (id) => names.get(id)));
}
