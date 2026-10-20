import { MAX_SEAT_COUNT } from "../geometry/constants.js";
import { cleanHouseholdName, householdNameKey, pruneEmptyHouseholds } from "./householdOps.js";
import { newId } from "./ids.js";
import { setSeatCount } from "./tableOps.js";
import {
  type EventDoc,
  type Guest,
  type Household,
  MAX_GUEST_EMAIL_LENGTH,
  MAX_GUEST_NEED_LENGTH,
  MAX_GUEST_NOTE_LENGTH,
  MAX_MEAL_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_GUEST,
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
  /** Household / party name. Guests with the same name (case-insensitive)
   * share a household, including an existing household of that name. */
  household?: string | null;
  meal?: string | null;
  dietary?: string | null;
  accessibility?: string | null;
  notes?: string | null;
  tags?: string[];
  isChild?: boolean;
}

export interface GuestPatch {
  name?: string;
  email?: string | null;
  phone?: string | null;
  rsvpStatus?: RsvpStatus;
  meal?: string | null;
  dietary?: string | null;
  accessibility?: string | null;
  notes?: string | null;
  tags?: string[];
  isChild?: boolean;
}

/** Collapses whitespace in a short label (meal, tag). */
function cleanLabel(value: string, max: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

/**
 * Reuses an existing value's spelling when one matches case-insensitively,
 * so "chicken" and "Chicken" count as the same meal or tag.
 */
function canonical(value: string, existing: Iterable<string>): string {
  const key = value.toLowerCase();
  for (const candidate of existing) if (candidate.toLowerCase() === key) return candidate;
  return value;
}

function cleanMeal(value: string | null | undefined, existing: Iterable<string>): string | null {
  const cleaned = cleanLabel(value ?? "", MAX_MEAL_LENGTH);
  return cleaned ? canonical(cleaned, existing) : null;
}

/** Trims, dedupes (case-insensitively) and caps a guest's tags. */
function cleanTags(values: string[] | undefined, existing: Iterable<string>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of values ?? []) {
    const cleaned = cleanLabel(raw, MAX_TAG_LENGTH);
    if (!cleaned || seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());
    result.push(canonical(cleaned, existing));
    if (result.length === MAX_TAGS_PER_GUEST) break;
  }
  return result;
}

/** Adds a value to a set of known spellings and returns it. */
function remember<T extends string | null>(value: T, known: Set<string>): T {
  if (value) known.add(value);
  return value;
}

/** Every meal in use, sorted (for pickers and per-table totals). */
export function mealOptions(doc: EventDoc): string[] {
  const meals = new Set(doc.guests.map((guest) => guest.meal).filter((m): m is string => !!m));
  return [...meals].sort((a, b) => a.localeCompare(b));
}

/** Every tag in use, sorted. */
export function tagOptions(doc: EventDoc): string[] {
  return [...new Set(doc.guests.flatMap((guest) => guest.tags))].sort((a, b) => a.localeCompare(b));
}

/** Trims and length-limits optional text; blank becomes null. */
function cleanOptional(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanName(value: string): string {
  return value.trim().slice(0, MAX_GUEST_NAME_LENGTH);
}

/**
 * Adds guests (pending RSVP, unseated). Blank names are skipped. A `household`
 * name joins the existing household with that name, or creates one.
 */
export function addGuests(
  doc: EventDoc,
  inputs: GuestInput[],
): { doc: EventDoc; guestIds: string[] } {
  const householdByKey = new Map(doc.households.map((h) => [householdNameKey(h.name), h.id]));
  const newHouseholds: Household[] = [];
  const householdIdFor = (name: string | null | undefined): string | null => {
    const cleaned = cleanHouseholdName(name ?? "");
    if (!cleaned) return null;
    const key = householdNameKey(cleaned);
    const existing = householdByKey.get(key);
    if (existing) return existing;
    const household = { id: newId(), name: cleaned };
    householdByKey.set(key, household.id);
    newHouseholds.push(household);
    return household.id;
  };

  // Meals and tags already in the event (and earlier rows of this batch)
  // set the spelling for case-insensitive matches.
  const meals = new Set(mealOptions(doc));
  const tags = new Set(tagOptions(doc));
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
      householdId: householdIdFor(input.household),
      meal: remember(cleanMeal(input.meal, meals), meals),
      dietary: cleanOptional(input.dietary, MAX_GUEST_NEED_LENGTH),
      accessibility: cleanOptional(input.accessibility, MAX_GUEST_NEED_LENGTH),
      notes: cleanOptional(input.notes, MAX_GUEST_NOTE_LENGTH),
      tags: cleanTags(input.tags, tags).map((tag) => remember(tag, tags)),
      isChild: input.isChild ?? false,
    }));
  if (created.length === 0) return { doc, guestIds: [] };
  return {
    doc: {
      ...doc,
      guests: [...doc.guests, ...created],
      households: [...doc.households, ...newHouseholds],
    },
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
        meal: patch.meal === undefined ? guest.meal : cleanMeal(patch.meal, mealOptions(doc)),
        dietary:
          patch.dietary === undefined
            ? guest.dietary
            : cleanOptional(patch.dietary, MAX_GUEST_NEED_LENGTH),
        accessibility:
          patch.accessibility === undefined
            ? guest.accessibility
            : cleanOptional(patch.accessibility, MAX_GUEST_NEED_LENGTH),
        notes:
          patch.notes === undefined
            ? guest.notes
            : cleanOptional(patch.notes, MAX_GUEST_NOTE_LENGTH),
        tags: patch.tags === undefined ? guest.tags : cleanTags(patch.tags, tagOptions(doc)),
        isChild: patch.isChild ?? guest.isChild,
      };
    }),
  };
}

/** Deletes a guest (and their household, if they were its last member). */
export function removeGuest(doc: EventDoc, guestId: string): EventDoc {
  if (!doc.guests.some((guest) => guest.id === guestId)) return doc;
  return pruneEmptyHouseholds({
    ...doc,
    guests: doc.guests.filter((guest) => guest.id !== guestId),
  });
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

/** One line of a seat plan: put this guest in this seat (null = unseat). */
export interface SeatPlanEntry {
  guestId: string;
  seatId: string | null;
}

/**
 * Applies many seat changes as a single edit (the placement dialog's
 * Confirm). Entries naming unknown guests or seats are skipped. If two entries
 * claim one seat, the later wins and the earlier guest is unseated. Anyone not
 * in the plan who sits in a seat the plan hands out is unseated. Returns the
 * same document when nothing changes.
 */
export function applySeatPlan(doc: EventDoc, entries: SeatPlanEntry[]): EventDoc {
  const known = new Set(doc.guests.map((guest) => guest.id));
  const seatIds = new Set(doc.tables.flatMap((table) => table.seats.map((seat) => seat.id)));
  const planned = new Map<string, string | null>();
  const ownerOfSeat = new Map<string, string>();
  for (const { guestId, seatId } of entries) {
    if (!known.has(guestId) || (seatId !== null && !seatIds.has(seatId))) continue;
    const previousSeat = planned.get(guestId);
    if (previousSeat) ownerOfSeat.delete(previousSeat);
    if (seatId !== null) {
      const rival = ownerOfSeat.get(seatId);
      if (rival && rival !== guestId) planned.set(rival, null);
      ownerOfSeat.set(seatId, guestId);
    }
    planned.set(guestId, seatId);
  }

  let changed = false;
  const guests = doc.guests.map((guest) => {
    const next = planned.has(guest.id)
      ? (planned.get(guest.id) ?? null)
      : guest.seatId !== null && ownerOfSeat.has(guest.seatId)
        ? null
        : guest.seatId;
    if (next === guest.seatId) return guest;
    changed = true;
    return { ...guest, seatId: next };
  });
  return changed ? { ...doc, guests } : doc;
}

/**
 * Open seats at a table for a group: seats nobody holds, plus seats held by
 * members of the group (they'd be re-packed). Unknown tables have none.
 */
export function openSeatIds(doc: EventDoc, tableId: string, forGuestIds: string[] = []): string[] {
  const table = doc.tables.find((candidate) => candidate.id === tableId);
  if (!table) return [];
  const group = new Set(forGuestIds);
  const takenByOthers = new Set(
    doc.guests.filter((guest) => guest.seatId && !group.has(guest.id)).map((g) => g.seatId),
  );
  return table.seats.map((seat) => seat.id).filter((id) => !takenByOthers.has(id));
}

/** How many open seats a table has for a group (see `openSeatIds`). */
export function openSeatCount(doc: EventDoc, tableId: string, forGuestIds: string[] = []): number {
  return openSeatIds(doc, tableId, forGuestIds).length;
}

export interface TableAssignResult {
  doc: EventDoc;
  /** How many of the requested guests got a seat. */
  assigned: number;
  /** Open seats the table had for this group. */
  capacity: number;
  /** The requested guests who got a seat, in seat order. */
  seatedIds: string[];
  /** The requested guests who didn't fit, in the order given. */
  unseatedIds: string[];
}

export interface TableAssignOptions {
  /**
   * When false (the default), household members in the group are seated
   * all-or-nothing: a household that doesn't fit in the remaining seats is
   * left out whole and smaller parties after it still get seated. When true,
   * the group simply fills seats in order, which can split a household.
   */
  splitHouseholds?: boolean;
}

/** The ids that name real guests, de-duplicated, in the order given. */
function knownGuestIds(doc: EventDoc, guestIds: string[]): string[] {
  const known = new Set(doc.guests.map((guest) => guest.id));
  return [...new Set(guestIds)].filter((id) => known.has(id));
}

/**
 * Splits a group into seating units: each household's members in the group
 * form one unit (positioned at its first member), everyone else is a unit of
 * one. With `split`, every guest is their own unit.
 */
function seatingUnits(doc: EventDoc, guestIds: string[], split: boolean): string[][] {
  const householdOf = new Map(doc.guests.map((guest) => [guest.id, guest.householdId]));
  const units: string[][] = [];
  const unitByHousehold = new Map<string, string[]>();
  for (const id of guestIds) {
    const householdId = split ? null : (householdOf.get(id) ?? null);
    if (!householdId) {
      units.push([id]);
      continue;
    }
    const unit = unitByHousehold.get(householdId);
    if (unit) {
      unit.push(id);
    } else {
      const fresh = [id];
      unitByHousehold.set(householdId, fresh);
      units.push(fresh);
    }
  }
  return units;
}

/**
 * Seats a group at a table, first-come into its open seats. Seats held by
 * guests outside the group are unavailable; seats held by group members count
 * as open (the group is re-packed). Households stay whole unless
 * `splitHouseholds` is set. Guests who don't fit keep their current seat,
 * unless that seat was needed for someone else in the group (then they're
 * unseated).
 */
export function assignGuestsToTable(
  doc: EventDoc,
  guestIds: string[],
  tableId: string,
  options: TableAssignOptions = {},
): TableAssignResult {
  const requested = knownGuestIds(doc, guestIds);
  if (!doc.tables.some((table) => table.id === tableId)) {
    return { doc, assigned: 0, capacity: 0, seatedIds: [], unseatedIds: requested };
  }

  const openSeats = openSeatIds(doc, tableId, requested);
  const seatedIds: string[] = [];
  for (const unit of seatingUnits(doc, requested, options.splitHouseholds ?? false)) {
    if (seatedIds.length + unit.length <= openSeats.length) seatedIds.push(...unit);
    else if (options.splitHouseholds) break;
  }
  const seated = new Set(seatedIds);
  const unseatedIds = requested.filter((id) => !seated.has(id));

  const target = new Map<string, string>();
  seatedIds.forEach((guestId, i) => target.set(guestId, openSeats[i]));
  const targetSeats = new Set(target.values());

  const guests = doc.guests.map((guest) => {
    const seatId = target.get(guest.id);
    if (seatId) return guest.seatId === seatId ? guest : { ...guest, seatId };
    // A group member already in one of the target seats who didn't get a new
    // seat (only possible when the group exceeds capacity) is moved out.
    if (guest.seatId && targetSeats.has(guest.seatId)) return { ...guest, seatId: null };
    return guest;
  });

  return {
    doc: { ...doc, guests },
    assigned: seatedIds.length,
    capacity: openSeats.length,
    seatedIds,
    unseatedIds,
  };
}

export interface AddChairsResult extends TableAssignResult {
  /** Chairs added to the table. */
  addedChairs: number;
}

/**
 * Adds just enough chairs to a table for a group, then seats the group there
 * (households kept whole). The table never grows past MAX_SEAT_COUNT, so a
 * very large group may still not fully fit. Uses the table's own layout:
 * auto tables re-space evenly, custom tables get their chairs re-spread
 * (same as changing the chair count in the properties panel).
 */
export function addChairsAndAssign(
  doc: EventDoc,
  guestIds: string[],
  tableId: string,
): AddChairsResult {
  const table = doc.tables.find((candidate) => candidate.id === tableId);
  const requested = knownGuestIds(doc, guestIds);
  if (!table) {
    return { doc, assigned: 0, capacity: 0, seatedIds: [], unseatedIds: requested, addedChairs: 0 };
  }
  const shortBy = Math.max(0, requested.length - openSeatCount(doc, tableId, requested));
  const count = Math.min(MAX_SEAT_COUNT, table.seats.length + shortBy);
  const grown = setSeatCount(doc, tableId, count);
  const result = assignGuestsToTable(grown, requested, tableId);
  return { ...result, addedChairs: count - table.seats.length };
}
