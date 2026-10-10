import { newId } from "./ids.js";
import { type EventDoc, type Guest, type Household, MAX_HOUSEHOLD_NAME_LENGTH } from "./schema.js";

/**
 * Households: guests who should be seated together (a family, a couple, a
 * party of four). Membership lives on each guest as `householdId`. Like every
 * op, these return new documents; any household left with no members is
 * dropped in the same step, so a document never carries empty households.
 */

/** Collapses whitespace and length-limits a household name; blank stays blank. */
export function cleanHouseholdName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_HOUSEHOLD_NAME_LENGTH);
}

/** Case-insensitive key used to match household names (e.g. on import). */
export function householdNameKey(name: string): string {
  return cleanHouseholdName(name).toLowerCase();
}

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * A readable default name for a new household from its members' names:
 * "Lovelace household" when they share a surname, otherwise "Ada & Grace" or
 * "Ada, Grace & 2 more".
 */
export function defaultHouseholdName(names: string[]): string {
  if (names.length === 0) return "Household";
  const shared = surname(names[0]);
  if (shared && names.every((name) => surname(name).toLowerCase() === shared.toLowerCase())) {
    return cleanHouseholdName(`${shared} household`);
  }
  const firsts = names.map(firstName);
  if (firsts.length === 1) return cleanHouseholdName(`${firsts[0]}'s household`);
  if (firsts.length === 2) return cleanHouseholdName(`${firsts[0]} & ${firsts[1]}`);
  return cleanHouseholdName(`${firsts[0]}, ${firsts[1]} & ${firsts.length - 2} more`);
}

/** Drops households that no guest belongs to any more. */
export function pruneEmptyHouseholds(doc: EventDoc): EventDoc {
  const used = new Set(doc.guests.map((guest) => guest.householdId).filter(Boolean));
  if (doc.households.every((household) => used.has(household.id))) return doc;
  return { ...doc, households: doc.households.filter((household) => used.has(household.id)) };
}

/**
 * Puts guests into a new household (taking them out of any household they
 * were in). A blank name gets a default from the members' names. Unknown guest
 * ids are ignored; with no known guests the document is unchanged.
 */
export function createHousehold(
  doc: EventDoc,
  guestIds: string[],
  name = "",
): { doc: EventDoc; householdId: string | null } {
  const wanted = new Set(guestIds);
  const members = doc.guests.filter((guest) => wanted.has(guest.id));
  if (members.length === 0) return { doc, householdId: null };

  const household: Household = {
    id: newId(),
    name: cleanHouseholdName(name) || defaultHouseholdName(members.map((guest) => guest.name)),
  };
  const next: EventDoc = {
    ...doc,
    households: [...doc.households, household],
    guests: doc.guests.map((guest) =>
      wanted.has(guest.id) ? { ...guest, householdId: household.id } : guest,
    ),
  };
  return { doc: pruneEmptyHouseholds(next), householdId: household.id };
}

/** Renames a household. A blank name is ignored. */
export function renameHousehold(doc: EventDoc, householdId: string, name: string): EventDoc {
  const cleaned = cleanHouseholdName(name);
  if (!cleaned) return doc;
  let changed = false;
  const households = doc.households.map((household) => {
    if (household.id !== householdId || household.name === cleaned) return household;
    changed = true;
    return { ...household, name: cleaned };
  });
  return changed ? { ...doc, households } : doc;
}

/** Takes guests out of their households (dropping households left empty). */
export function removeFromHousehold(doc: EventDoc, guestIds: string[]): EventDoc {
  const leaving = new Set(guestIds);
  if (!doc.guests.some((guest) => leaving.has(guest.id) && guest.householdId)) return doc;
  return pruneEmptyHouseholds({
    ...doc,
    guests: doc.guests.map((guest) =>
      leaving.has(guest.id) && guest.householdId ? { ...guest, householdId: null } : guest,
    ),
  });
}

/** Removes a household; its members stay as individual guests. */
export function dissolveHousehold(doc: EventDoc, householdId: string): EventDoc {
  const memberIds = doc.guests
    .filter((guest) => guest.householdId === householdId)
    .map((guest) => guest.id);
  const next = removeFromHousehold(doc, memberIds);
  // Also covers a (normally impossible) household with no members.
  return pruneEmptyHouseholds(next);
}

// ---- Queries (read-only) ----------------------------------------------------

/** Members of a household, in guest-list order. */
export function householdMembers(doc: EventDoc, householdId: string): Guest[] {
  return doc.guests.filter((guest) => guest.householdId === householdId);
}

/**
 * Adds every missing household member to a list of guest ids. Missing members
 * are inserted right after the first member already in the list, so a family
 * stays contiguous (and gets neighbouring seats).
 */
export function expandToHouseholds(doc: EventDoc, guestIds: string[]): string[] {
  const byId = new Map(doc.guests.map((guest) => [guest.id, guest]));
  const result: string[] = [];
  const seen = new Set<string>();
  const add = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    result.push(id);
  };
  for (const id of guestIds) {
    const householdId = byId.get(id)?.householdId;
    if (!householdId) {
      add(id);
      continue;
    }
    if (seen.has(id)) continue;
    // Keep the caller's order for members they picked, then the rest.
    for (const picked of guestIds) {
      if (byId.get(picked)?.householdId === householdId) add(picked);
    }
    for (const member of householdMembers(doc, householdId)) add(member.id);
  }
  return result;
}

/** A household that a seating move would split up. */
export interface HouseholdSplit {
  household: Household;
  /** Members being moved. */
  movingIds: string[];
  /** Members who would end up somewhere else (another table, or unseated). */
  leftBehindIds: string[];
}

/** Maps each seat id to the id of the table it belongs to. */
export function tableIdBySeat(doc: EventDoc): Map<string, string> {
  const map = new Map<string, string>();
  for (const table of doc.tables) {
    for (const seat of table.seats) map.set(seat.id, table.id);
  }
  return map;
}

/**
 * Households that moving `guestIds` to `tableId` would split: some members
 * move, and at least one other member isn't already at that table. An empty
 * list means the move keeps every household together.
 */
export function householdSplits(
  doc: EventDoc,
  guestIds: string[],
  tableId: string,
): HouseholdSplit[] {
  const moving = new Set(guestIds);
  const seatTable = tableIdBySeat(doc);
  const splits: HouseholdSplit[] = [];
  for (const household of doc.households) {
    const members = householdMembers(doc, household.id);
    const movingIds = members.filter((m) => moving.has(m.id)).map((m) => m.id);
    if (movingIds.length === 0) continue;
    const leftBehindIds = members
      .filter((m) => !moving.has(m.id))
      .filter((m) => !m.seatId || seatTable.get(m.seatId) !== tableId)
      .map((m) => m.id);
    if (leftBehindIds.length > 0) splits.push({ household, movingIds, leftBehindIds });
  }
  return splits;
}
