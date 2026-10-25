import type { EventDoc } from "@seating/shared";

import { tableDisplayName } from "../../editor/lib/tableLabel";

/** Where a seat is, for notices: "Table 5, seat 8" ("no seat" for null). */
export function seatPlace(doc: EventDoc, seatId: string | null): string {
  if (!seatId) return "no seat";
  for (const [index, table] of doc.tables.entries()) {
    const seat = table.seats.find((candidate) => candidate.id === seatId);
    if (seat) return `${tableDisplayName(table.label, index)}, seat ${seat.index + 1}`;
  }
  return "no seat";
}

/** "Swapped Marie Curie (now Table 5, seat 8) and Alan Turing (now Head
 * table, seat 1)." — read from the document after the swap. */
export function swapNotice(doc: EventDoc, guestA: string, guestB: string): string {
  const describe = (id: string): string => {
    const guest = doc.guests.find((candidate) => candidate.id === id);
    const seatId = guest?.seatId ?? null;
    return `${guest?.name ?? "Guest"} (now ${seatId ? seatPlace(doc, seatId) : "unseated"})`;
  };
  return `Swapped ${describe(guestA)} and ${describe(guestB)}.`;
}
