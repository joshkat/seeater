import { z } from "zod";

/** Structural view of a document, enough to check cross-references. Declared
 * locally (not imported from schema.ts) to avoid a circular import. */
interface DocLike {
  tables: { id: string; seats: { id: string; index: number }[] }[];
  guests: { id: string; seatId: string | null; householdId: string | null }[];
  households: { id: string }[];
}

/**
 * Cross-reference rules a document must satisfy beyond its shape:
 * - table, seat and guest ids are unique within the document;
 * - each table's seats are ordered with `index` equal to array position;
 * - a guest's `seatId` points at a seat that exists;
 * - no two guests share a seat (one guest per seat);
 * - household ids are unique and a guest's `householdId` points at one.
 */
export function checkEventDocIntegrity(doc: DocLike, ctx: z.RefinementCtx): void {
  const issue = (message: string, path: (string | number)[]): void => {
    ctx.addIssue({ code: "custom", message, path });
  };

  const tableIds = new Set<string>();
  const seatIds = new Set<string>();
  doc.tables.forEach((table, tableIndex) => {
    if (tableIds.has(table.id)) issue(`Duplicate table id ${table.id}`, ["tables", tableIndex]);
    tableIds.add(table.id);
    table.seats.forEach((seat, seatIndex) => {
      const path = ["tables", tableIndex, "seats", seatIndex];
      if (seatIds.has(seat.id)) issue(`Duplicate seat id ${seat.id}`, path);
      seatIds.add(seat.id);
      if (seat.index !== seatIndex) issue("Seat index must equal its array position", path);
    });
  });

  const householdIds = new Set<string>();
  doc.households.forEach((household, householdIndex) => {
    if (householdIds.has(household.id)) {
      issue(`Duplicate household id ${household.id}`, ["households", householdIndex]);
    }
    householdIds.add(household.id);
  });

  const guestIds = new Set<string>();
  const occupied = new Set<string>();
  doc.guests.forEach((guest, guestIndex) => {
    const path = ["guests", guestIndex];
    if (guestIds.has(guest.id)) issue(`Duplicate guest id ${guest.id}`, path);
    guestIds.add(guest.id);
    if (guest.householdId !== null && !householdIds.has(guest.householdId)) {
      issue(`Guest household ${guest.householdId} does not exist`, path);
    }
    if (guest.seatId === null) return;
    if (!seatIds.has(guest.seatId)) issue(`Guest seat ${guest.seatId} does not exist`, path);
    if (occupied.has(guest.seatId)) issue(`Seat ${guest.seatId} has more than one guest`, path);
    occupied.add(guest.seatId);
  });
}
