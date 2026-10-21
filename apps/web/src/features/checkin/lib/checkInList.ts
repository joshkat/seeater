import type { EventDoc, LayoutView } from "@seating/shared";

import { type SeatingRow, seatingRows, sortName } from "../../export/lib/seatingRows";
import { NO_FILTER, matchesFilter } from "../../guests/lib/guestFilter";

/** Which guests the check-in list shows. */
export type ArrivalFilter = "all" | "waiting" | "arrived";

export interface CheckInRow extends SeatingRow {
  householdName: string | null;
  /** Other members of the guest's household who haven't arrived yet. */
  partyWaitingIds: string[];
}

/**
 * The door list: guests sorted by surname, narrowed by the search text and
 * the arrival filter. Declined guests who haven't arrived are left out unless
 * the search finds them (someone who said no may still turn up).
 */
export function checkInList(
  doc: EventDoc,
  view: LayoutView,
  query: string,
  arrival: ArrivalFilter,
): CheckInRow[] {
  const households = new Map(doc.households.map((h) => [h.id, h.name]));
  const filter = { ...NO_FILTER, query };
  const searching = query.trim() !== "";
  const waitingByHousehold = new Map<string, string[]>();
  for (const guest of doc.guests) {
    if (!guest.householdId || guest.checkedInAt !== null) continue;
    const ids = waitingByHousehold.get(guest.householdId) ?? [];
    ids.push(guest.id);
    waitingByHousehold.set(guest.householdId, ids);
  }

  return seatingRows(doc, view)
    .filter(({ guest }) => {
      const arrived = guest.checkedInAt !== null;
      if (arrival === "waiting" && arrived) return false;
      if (arrival === "arrived" && !arrived) return false;
      if (!searching && !arrived && guest.rsvpStatus === "declined") return false;
      return matchesFilter(guest, filter, (id) => households.get(id));
    })
    .sort((a, b) => sortName(a.guest.name).localeCompare(sortName(b.guest.name)))
    .map((row) => ({
      ...row,
      householdName: row.guest.householdId ? (households.get(row.guest.householdId) ?? null) : null,
      partyWaitingIds: row.guest.householdId
        ? (waitingByHousehold.get(row.guest.householdId) ?? []).filter((id) => id !== row.guest.id)
        : [],
    }));
}
