import { z } from "zod";

/** Structural view of a document, enough to check cross-references. Declared
 * locally (not imported from schema.ts) to avoid a circular import. */
interface TableLike {
  id: string;
  seats: { id: string; index: number }[];
}

interface DocLike {
  tables: TableLike[];
  objects: { id: string }[];
  guests: { id: string; seatId: string | null; householdId: string | null }[];
  households: { id: string }[];
  layouts: {
    id: string;
    stored: {
      tables: TableLike[];
      seating: Record<string, string>;
      objects: { id: string }[];
    } | null;
  }[];
  activeLayoutId: string;
}

/**
 * Cross-reference rules a document must satisfy beyond its shape:
 * - table, seat and guest ids are unique within the document;
 * - each table's seats are ordered with `index` equal to array position;
 * - a guest's `seatId` points at a seat that exists;
 * - no two guests share a seat (one guest per seat);
 * - household ids are unique and a guest's `householdId` points at one;
 * - layouts: ids unique, the active one exists and is the only one without
 *   `stored`; table and seat ids are unique across all layouts; a stored
 *   layout's seating maps existing guests to its own seats, one per seat.
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

  checkLayouts(doc, guestIds, tableIds, seatIds, issue);

  // Room object ids are unique across every layout.
  const objectIds = new Set<string>();
  const objectLists: [{ id: string }[], (string | number)[]][] = [
    [doc.objects, ["objects"]],
    ...doc.layouts.flatMap((layout, index): [{ id: string }[], (string | number)[]][] =>
      layout.stored ? [[layout.stored.objects, ["layouts", index, "stored", "objects"]]] : [],
    ),
  ];
  for (const [objects, path] of objectLists) {
    objects.forEach((object, index) => {
      if (objectIds.has(object.id))
        issue(`Duplicate room object id ${object.id}`, [...path, index]);
      objectIds.add(object.id);
    });
  }
}

function checkLayouts(
  doc: DocLike,
  guestIds: Set<string>,
  tableIds: Set<string>,
  seatIds: Set<string>,
  issue: (message: string, path: (string | number)[]) => void,
): void {
  const layoutIds = new Set<string>();
  let active = 0;
  doc.layouts.forEach((layout, layoutIndex) => {
    const path = ["layouts", layoutIndex];
    if (layoutIds.has(layout.id)) issue(`Duplicate layout id ${layout.id}`, path);
    layoutIds.add(layout.id);
    const isActive = layout.id === doc.activeLayoutId;
    if (isActive) active += 1;
    if (isActive !== (layout.stored === null)) {
      issue("Only the active layout has no stored content", path);
    }
    if (!layout.stored) return;

    const ownSeats = new Set<string>();
    layout.stored.tables.forEach((table, tableIndex) => {
      const tablePath = [...path, "stored", "tables", tableIndex];
      if (tableIds.has(table.id)) issue(`Duplicate table id ${table.id}`, tablePath);
      tableIds.add(table.id);
      table.seats.forEach((seat, seatIndex) => {
        const seatPath = [...tablePath, "seats", seatIndex];
        if (seatIds.has(seat.id)) issue(`Duplicate seat id ${seat.id}`, seatPath);
        seatIds.add(seat.id);
        ownSeats.add(seat.id);
        if (seat.index !== seatIndex) issue("Seat index must equal its array position", seatPath);
      });
    });
    const taken = new Set<string>();
    for (const [guestId, seatId] of Object.entries(layout.stored.seating)) {
      const seatingPath = [...path, "stored", "seating", guestId];
      if (!guestIds.has(guestId)) issue(`Seating for unknown guest ${guestId}`, seatingPath);
      if (!ownSeats.has(seatId)) issue(`Seat ${seatId} isn't in this layout`, seatingPath);
      if (taken.has(seatId)) issue(`Seat ${seatId} has more than one guest`, seatingPath);
      taken.add(seatId);
    }
  });
  if (active !== 1) issue("The active layout must exist exactly once", ["activeLayoutId"]);
}
