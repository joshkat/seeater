import type { LayoutView } from "./layoutOps.js";
import type { EventDoc, Guest } from "./schema.js";

/**
 * Read-only numbers for the stats view and the canvas: who's seated, how
 * full each table is, and meal totals per table for caterers. Works on any
 * layout via `layoutViews`.
 */

export interface GuestTotals {
  total: number;
  seated: number;
  unseated: number;
  going: number;
  pending: number;
  declined: number;
  /** Not declined and not seated: still needs a seat. */
  needSeat: number;
  children: number;
}

/** Label used for guests with no meal chosen. */
export const NO_MEAL = "No meal chosen";

export interface TableStats {
  tableId: string;
  label: string;
  chairs: number;
  seated: number;
  /** Meal → count, most common first. */
  meals: [string, number][];
  children: number;
  /** "Name: need" lines for dietary or accessibility notes at this table. */
  needs: string[];
}

export interface LayoutStats {
  layoutId: string;
  name: string;
  chairs: number;
  seated: GuestTotals;
  tables: TableStats[];
  /** Meal totals across the whole layout. */
  meals: [string, number][];
}

/** Totals over the guest list, with "seated" taken from one layout's seating. */
export function guestTotals(guests: Guest[], seating: Map<string, string>): GuestTotals {
  let seated = 0;
  let going = 0;
  let pending = 0;
  let declined = 0;
  let needSeat = 0;
  let children = 0;
  for (const guest of guests) {
    const isSeated = seating.has(guest.id);
    if (isSeated) seated += 1;
    if (guest.rsvpStatus === "accepted") going += 1;
    else if (guest.rsvpStatus === "declined") declined += 1;
    else pending += 1;
    if (!isSeated && guest.rsvpStatus !== "declined") needSeat += 1;
    if (guest.isChild) children += 1;
  }
  return {
    total: guests.length,
    seated,
    unseated: guests.length - seated,
    going,
    pending,
    declined,
    needSeat,
    children,
  };
}

function countMeals(guests: Guest[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const guest of guests) {
    const meal = guest.meal ?? NO_MEAL;
    counts.set(meal, (counts.get(meal) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Stats for one layout: per table and in total. Declined guests still count
 * where they sit (they're shown dimmed), but not in meal totals. */
export function layoutStats(doc: EventDoc, view: LayoutView): LayoutStats {
  const guestBySeat = new Map<string, Guest>();
  const byId = new Map(doc.guests.map((guest) => [guest.id, guest]));
  for (const [guestId, seatId] of view.seating) {
    const guest = byId.get(guestId);
    if (guest) guestBySeat.set(seatId, guest);
  }

  const tables = view.tables.map((table, index): TableStats => {
    const seatedGuests = table.seats
      .map((seat) => guestBySeat.get(seat.id))
      .filter((guest): guest is Guest => guest !== undefined);
    const eating = seatedGuests.filter((guest) => guest.rsvpStatus !== "declined");
    return {
      tableId: table.id,
      label: table.label.trim() || `Table ${index + 1}`,
      chairs: table.seats.length,
      seated: seatedGuests.length,
      meals: countMeals(eating),
      children: seatedGuests.filter((guest) => guest.isChild).length,
      needs: seatedGuests.flatMap((guest) =>
        [guest.dietary, guest.accessibility]
          .filter((need): need is string => !!need)
          .map((need) => `${guest.name}: ${need}`),
      ),
    };
  });

  const seatedGuests = [...guestBySeat.values()];
  return {
    layoutId: view.id,
    name: view.name,
    chairs: tables.reduce((sum, table) => sum + table.chairs, 0),
    seated: guestTotals(doc.guests, view.seating),
    tables,
    meals: countMeals(seatedGuests.filter((guest) => guest.rsvpStatus !== "declined")),
  };
}
