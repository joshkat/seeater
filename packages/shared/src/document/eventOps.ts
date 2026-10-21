import type { Size } from "../types/geometry.js";
import { DEFAULT_FLOOR_PLAN_SIZE } from "../geometry/constants.js";
import { newId } from "./ids.js";
import {
  EVENT_DOC_SCHEMA_VERSION,
  type EventDoc,
  type ExactSeatPlacement,
  MAX_EVENT_NAME_LENGTH,
  type RoomObject,
  type Table,
  type UnitSystem,
} from "./schema.js";

/** A fresh id for `oldId`, recorded in `map`. */
function remember(map: Map<string, string>, oldId: string): string {
  const id = newId();
  map.set(oldId, id);
  return id;
}

/** Whole-document operations: create, rename, duplicate, settings. */

/** Events this small default to exact seat placement (setting "auto"). */
export const EXACT_SEAT_PLACEMENT_MAX_TABLES = 2;

function cleanEventName(name: string): string {
  return name.trim().slice(0, MAX_EVENT_NAME_LENGTH);
}

export interface NewEventOptions {
  name: string;
  dimensions?: Size;
  /** ISO timestamp; injectable for tests. */
  now?: string;
}

/** A brand-new, empty event document. */
export function createEventDoc({ name, dimensions, now }: NewEventOptions): EventDoc {
  const timestamp = now ?? new Date().toISOString();
  const layoutId = newId();
  return {
    schemaVersion: EVENT_DOC_SCHEMA_VERSION,
    id: newId(),
    name: cleanEventName(name) || "Untitled event",
    dimensions: dimensions ?? { ...DEFAULT_FLOOR_PLAN_SIZE },
    tables: [],
    objects: [],
    backdrop: null,
    guests: [],
    households: [],
    rules: [],
    settings: { exactSeatPlacement: "auto", units: "auto" },
    layouts: [{ id: layoutId, name: "Main", stored: null }],
    activeLayoutId: layoutId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Renames an event. A blank name is ignored. */
export function renameEventDoc(doc: EventDoc, name: string): EventDoc {
  const cleaned = cleanEventName(name);
  return cleaned && cleaned !== doc.name ? { ...doc, name: cleaned } : doc;
}

export interface DuplicateOptions {
  /** Copy the guest list (names, contacts, RSVP). */
  copyGuests?: boolean;
  /** Keep copied guests in the same seats (only with copyGuests). */
  copyAssignments?: boolean;
  now?: string;
}

/**
 * Clones an event into a new, independent document. The layout is always
 * copied with fresh ids; guests (with their households) and their seat
 * assignments are opt-in, with references remapped onto the cloned ids.
 */
export function duplicateEventDoc(source: EventDoc, options: DuplicateOptions = {}): EventDoc {
  const timestamp = options.now ?? new Date().toISOString();
  const seatIdMap = new Map<string, string>();
  const cloneTables = (tables: Table[]): Table[] =>
    tables.map((table) => ({
      ...table,
      id: newId(),
      seats: table.seats.map((seat) => {
        const id = newId();
        seatIdMap.set(seat.id, id);
        return { ...seat, id };
      }),
    }));

  const tables = cloneTables(source.tables);
  const cloneObjects = (objects: RoomObject[]): RoomObject[] =>
    objects.map((object) => ({ ...object, id: newId() }));

  const householdIdMap = new Map<string, string>();
  const households = options.copyGuests
    ? source.households.map((household) => {
        const id = newId();
        householdIdMap.set(household.id, id);
        return { ...household, id };
      })
    : [];

  const guestIdMap = new Map<string, string>();
  const guests = options.copyGuests
    ? source.guests.map((guest) => ({
        ...guest,
        id: remember(guestIdMap, guest.id),
        seatId:
          options.copyAssignments && guest.seatId ? (seatIdMap.get(guest.seatId) ?? null) : null,
        householdId: guest.householdId ? (householdIdMap.get(guest.householdId) ?? null) : null,
      }))
    : [];

  // Other layouts: fresh table/seat ids; seating follows the guests (or is
  // dropped when guests or assignments aren't copied).
  const keepSeating = options.copyGuests && options.copyAssignments;
  const layouts = source.layouts.map((layout) => {
    if (!layout.stored) return layout;
    const storedTables = cloneTables(layout.stored.tables);
    const seating: Record<string, string> = {};
    if (keepSeating) {
      for (const [guestId, seatId] of Object.entries(layout.stored.seating)) {
        const newGuest = guestIdMap.get(guestId);
        const newSeat = seatIdMap.get(seatId);
        if (newGuest && newSeat) seating[newGuest] = newSeat;
      }
    }
    return {
      ...layout,
      stored: {
        ...layout.stored,
        tables: storedTables,
        seating,
        objects: cloneObjects(layout.stored.objects),
      },
    };
  });

  // Rules follow the guests (or go, if guests aren't copied).
  const rules = options.copyGuests
    ? source.rules.map((rule) => ({
        ...rule,
        id: newId(),
        guestIds: rule.guestIds.map((id) => guestIdMap.get(id) ?? id),
      }))
    : [];

  return {
    ...source,
    id: newId(),
    name: `${source.name} (copy)`.slice(0, MAX_EVENT_NAME_LENGTH),
    tables,
    objects: cloneObjects(source.objects),
    guests,
    households,
    rules,
    layouts,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Gives a document new ids throughout (used when importing a backup that
 * would otherwise collide with an existing event). Keeps name and guests. */
export function reidentifyEventDoc(source: EventDoc): EventDoc {
  const copy = duplicateEventDoc(source, {
    copyGuests: true,
    copyAssignments: true,
    now: source.updatedAt,
  });
  return { ...copy, name: source.name, createdAt: source.createdAt };
}

/** Sets how seating a group at a table behaves (see `isExactSeatPlacement`). */
export function setExactSeatPlacement(doc: EventDoc, mode: ExactSeatPlacement): EventDoc {
  if (doc.settings.exactSeatPlacement === mode) return doc;
  return { ...doc, settings: { ...doc.settings, exactSeatPlacement: mode } };
}

/** Whether seating a group opens the placement dialog: the explicit setting,
 * or for "auto", whether the event has 2 or fewer tables. */
export function isExactSeatPlacement(doc: EventDoc): boolean {
  const mode = doc.settings.exactSeatPlacement;
  if (mode === "auto") return doc.tables.length <= EXACT_SEAT_PLACEMENT_MAX_TABLES;
  return mode === "on";
}

/**
 * Restores an earlier version of an event in place: the version's content
 * (layout, guests, seating, name, settings) under the current document's
 * identity, so it stays the same event (same id, same URL).
 */
export function restoreEventDoc(current: EventDoc, version: EventDoc): EventDoc {
  return { ...version, id: current.id, createdAt: current.createdAt, updatedAt: current.updatedAt };
}

/** Sets how lengths are shown (plan units are centimetres either way). */
export function setUnitSystem(doc: EventDoc, units: UnitSystem): EventDoc {
  if (doc.settings.units === units) return doc;
  return { ...doc, settings: { ...doc.settings, units } };
}

/** Resizes the floor plan (plan units, i.e. cm). Tables keep their positions. */
export function setFloorSize(doc: EventDoc, size: Size): EventDoc {
  const width = Math.max(MIN_FLOOR_SIZE, Math.round(size.width));
  const height = Math.max(MIN_FLOOR_SIZE, Math.round(size.height));
  if (width === doc.dimensions.width && height === doc.dimensions.height) return doc;
  return { ...doc, dimensions: { width, height } };
}

/** Smallest floor side (plan units). */
export const MIN_FLOOR_SIZE = 200;
