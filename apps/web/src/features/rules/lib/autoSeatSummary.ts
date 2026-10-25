import type { AutoSeatResult } from "@seating/shared";
import { tableIdBySeat } from "@seating/shared";

import { nameList } from "../../editor/lib/unseatNotices";
import { tableNameById } from "../../editor/lib/tableLabel";

/** How many "name → table" pairs the notice spells out. */
const MAX_LISTED = 3;

/**
 * What auto-seat did, for its notice: "Auto-seated 2 guests: Lise Meitner →
 * Table 2, Niels Bohr → Table 7." Long runs list the first few and count
 * the rest; anyone who didn't fit is named after.
 */
export function autoSeatSummary(result: AutoSeatResult): string {
  const { doc, seatedIds, unplacedIds } = result;
  const guests = new Map(doc.guests.map((guest) => [guest.id, guest]));
  const seatTable = tableIdBySeat(doc);
  const placed = seatedIds.slice(0, MAX_LISTED).map((id) => {
    const guest = guests.get(id);
    const tableId = guest?.seatId ? seatTable.get(guest.seatId) : undefined;
    return `${guest?.name ?? "Guest"} → ${tableId ? tableNameById(doc.tables, tableId) : "a table"}`;
  });
  const more = seatedIds.length - placed.length;
  const count = `${seatedIds.length} guest${seatedIds.length === 1 ? "" : "s"}`;
  const unplaced = unplacedIds.map((id) => guests.get(id)?.name ?? "Guest");
  const noRoom = unplaced.length > 0 ? `No room for ${nameList(unplaced)}.` : "";
  if (seatedIds.length === 0) return noRoom || "Nobody needed a seat.";
  const head = `Auto-seated ${count}: ${placed.join(", ")}${more > 0 ? ` and ${more} more` : ""}.`;
  return noRoom ? `${head} ${noRoom}` : head;
}
