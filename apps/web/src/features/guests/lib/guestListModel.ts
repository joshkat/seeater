import type { Guest, Household } from "@seating/shared";

/** One row group in the "Unassigned" section: a lone guest, or a household
 * header with its unassigned members underneath. */
export type UnassignedEntry =
  | { kind: "guest"; guest: Guest }
  | {
      kind: "household";
      household: Household;
      /** Members still without a seat, in guest-list order. */
      members: Guest[];
      /** Every member's id, seated or not (what clicking the header selects). */
      allMemberIds: string[];
    };

function entryLabel(entry: UnassignedEntry): string {
  return entry.kind === "guest" ? entry.guest.name : entry.household.name;
}

/**
 * Builds the "Unassigned" section: guests without a seat, with household
 * members grouped under their household, all sorted by name.
 */
export function buildUnassignedEntries(
  guests: Guest[],
  households: Household[],
): UnassignedEntry[] {
  const allMembers = new Map<string, string[]>();
  const unassignedMembers = new Map<string, Guest[]>();
  const loners: Guest[] = [];
  for (const guest of guests) {
    if (guest.householdId) {
      allMembers.set(guest.householdId, [...(allMembers.get(guest.householdId) ?? []), guest.id]);
    }
    if (guest.seatId) continue;
    if (guest.householdId) {
      unassignedMembers.set(guest.householdId, [
        ...(unassignedMembers.get(guest.householdId) ?? []),
        guest,
      ]);
    } else {
      loners.push(guest);
    }
  }

  const entries: UnassignedEntry[] = loners.map((guest) => ({ kind: "guest", guest }));
  for (const household of households) {
    const members = unassignedMembers.get(household.id);
    if (!members) continue;
    entries.push({
      kind: "household",
      household,
      members,
      allMemberIds: allMembers.get(household.id) ?? [],
    });
  }
  return entries.sort((a, b) => entryLabel(a).localeCompare(entryLabel(b)));
}

/** Guest ids in the order the section displays them. */
export function unassignedOrder(entries: UnassignedEntry[]): string[] {
  return entries.flatMap((entry) =>
    entry.kind === "guest" ? [entry.guest.id] : entry.members.map((member) => member.id),
  );
}

/**
 * "Select next N unassigned": the next `count` guests in display order after
 * the last one currently selected (from the top if none is, or if nothing is
 * left after it). Declined guests are skipped — they don't need a seat.
 */
export function nextUnassignedBatch(
  order: string[],
  guests: Guest[],
  selectedIds: string[],
  count: number,
): string[] {
  const declined = new Set(guests.filter((g) => g.rsvpStatus === "declined").map((g) => g.id));
  const candidates = order.filter((id) => !declined.has(id));
  const selected = new Set(selectedIds);
  let start = 0;
  candidates.forEach((id, index) => {
    if (selected.has(id)) start = index + 1;
  });
  if (start >= candidates.length) start = 0;
  return candidates.slice(start, start + Math.max(0, Math.floor(count)));
}
