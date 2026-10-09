import { createEventDoc } from "../eventOps.js";
import { addGuests } from "../guestOps.js";
import type { EventDoc } from "../schema.js";
import { addTable } from "../tableOps.js";

/** A valid doc with one 4-seat round table and three unseated guests. */
export function fixture(): { doc: EventDoc; tableId: string; guestIds: string[] } {
  const base = createEventDoc({ name: "Fixture", now: "2026-01-01T00:00:00.000Z" });
  const table = addTable(base, { shape: "round", position: { x: 400, y: 300 }, seatCount: 4 });
  const guests = addGuests(table.doc, [{ name: "Ada" }, { name: "Grace" }, { name: "Linus" }]);
  return { doc: guests.doc, tableId: table.tableId, guestIds: guests.guestIds };
}

export function seatIdsOf(doc: EventDoc, tableId: string): string[] {
  const table = doc.tables.find((candidate) => candidate.id === tableId);
  if (!table) throw new Error(`No table ${tableId}`);
  return table.seats.map((seat) => seat.id);
}

export function seatOf(doc: EventDoc, guestId: string): string | null {
  return doc.guests.find((guest) => guest.id === guestId)?.seatId ?? null;
}
