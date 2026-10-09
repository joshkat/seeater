import { newId } from "./ids.js";
import {
  type EventDoc,
  type Guest,
  MAX_GUEST_EMAIL_LENGTH,
  MAX_GUEST_NAME_LENGTH,
  MAX_GUEST_PHONE_LENGTH,
  type RsvpStatus,
} from "./schema.js";

/**
 * Pure guest/assignment operations on an EventDoc. Like the table ops they
 * return new documents and preserve the one-guest-per-seat invariant: seating
 * someone in an occupied seat displaces the previous occupant.
 */

export interface GuestInput {
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface GuestPatch {
  name?: string;
  email?: string | null;
  phone?: string | null;
  rsvpStatus?: RsvpStatus;
}

/** Trims and length-limits optional text; blank becomes null. */
function cleanOptional(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanName(value: string): string {
  return value.trim().slice(0, MAX_GUEST_NAME_LENGTH);
}

/** Adds guests (pending RSVP, unseated). Blank names are skipped. */
export function addGuests(
  doc: EventDoc,
  inputs: GuestInput[],
): { doc: EventDoc; guestIds: string[] } {
  const created: Guest[] = inputs
    .map((input) => ({ ...input, name: cleanName(input.name) }))
    .filter((input) => input.name.length > 0)
    .map((input) => ({
      id: newId(),
      name: input.name,
      email: cleanOptional(input.email, MAX_GUEST_EMAIL_LENGTH),
      phone: cleanOptional(input.phone, MAX_GUEST_PHONE_LENGTH),
      rsvpStatus: "pending",
      seatId: null,
    }));
  if (created.length === 0) return { doc, guestIds: [] };
  return {
    doc: { ...doc, guests: [...doc.guests, ...created] },
    guestIds: created.map((guest) => guest.id),
  };
}

/** Edits a guest's details or RSVP. A blank name is ignored (names are required). */
export function updateGuest(doc: EventDoc, guestId: string, patch: GuestPatch): EventDoc {
  return {
    ...doc,
    guests: doc.guests.map((guest) => {
      if (guest.id !== guestId) return guest;
      const name = patch.name === undefined ? guest.name : cleanName(patch.name) || guest.name;
      return {
        ...guest,
        name,
        email:
          patch.email === undefined
            ? guest.email
            : cleanOptional(patch.email, MAX_GUEST_EMAIL_LENGTH),
        phone:
          patch.phone === undefined
            ? guest.phone
            : cleanOptional(patch.phone, MAX_GUEST_PHONE_LENGTH),
        rsvpStatus: patch.rsvpStatus ?? guest.rsvpStatus,
      };
    }),
  };
}

export function removeGuest(doc: EventDoc, guestId: string): EventDoc {
  return { ...doc, guests: doc.guests.filter((guest) => guest.id !== guestId) };
}

function seatExists(doc: EventDoc, seatId: string): boolean {
  return doc.tables.some((table) => table.seats.some((seat) => seat.id === seatId));
}

/**
 * Seats a guest (or unseats with `seatId: null`). An occupied target seat
 * displaces its previous occupant. Unknown guests or seats are a no-op.
 */
export function assignSeat(doc: EventDoc, guestId: string, seatId: string | null): EventDoc {
  if (!doc.guests.some((guest) => guest.id === guestId)) return doc;
  if (seatId !== null && !seatExists(doc, seatId)) return doc;
  return {
    ...doc,
    guests: doc.guests.map((guest) => {
      if (guest.id === guestId) return { ...guest, seatId };
      if (seatId !== null && guest.seatId === seatId) return { ...guest, seatId: null };
      return guest;
    }),
  };
}

export interface TableAssignResult {
  doc: EventDoc;
  /** How many of the requested guests got a seat. */
  assigned: number;
  /** Open seats the table had for this group. */
  capacity: number;
}

/**
 * Seats a group at a table, first-come into its open seats. Seats held by
 * guests outside the group are unavailable; seats held by group members count
 * as open (the group is re-packed). Extra guests beyond capacity stay as-is.
 */
export function assignGuestsToTable(
  doc: EventDoc,
  guestIds: string[],
  tableId: string,
): TableAssignResult {
  const table = doc.tables.find((candidate) => candidate.id === tableId);
  if (!table) return { doc, assigned: 0, capacity: 0 };

  const group = new Set(guestIds);
  const takenByOthers = new Set(
    doc.guests.filter((guest) => guest.seatId && !group.has(guest.id)).map((g) => g.seatId),
  );
  const openSeats = table.seats.map((seat) => seat.id).filter((id) => !takenByOthers.has(id));

  const target = new Map<string, string>();
  guestIds.slice(0, openSeats.length).forEach((guestId, i) => target.set(guestId, openSeats[i]));
  const targetSeats = new Set(target.values());

  const guests = doc.guests.map((guest) => {
    const seatId = target.get(guest.id);
    if (seatId) return { ...guest, seatId };
    // A group member already in one of the target seats who didn't get a new
    // seat (only possible when the group exceeds capacity) is moved out.
    if (guest.seatId && targetSeats.has(guest.seatId)) return { ...guest, seatId: null };
    return guest;
  });

  return { doc: { ...doc, guests }, assigned: target.size, capacity: openSeats.length };
}
