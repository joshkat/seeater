import type { Size } from "../types/geometry.js";
import { DEFAULT_FLOOR_PLAN_SIZE } from "../geometry/constants.js";
import { newId } from "./ids.js";
import { EVENT_DOC_SCHEMA_VERSION, type EventDoc, MAX_EVENT_NAME_LENGTH } from "./schema.js";

/** Whole-document operations: create, rename, duplicate. */

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
  return {
    schemaVersion: EVENT_DOC_SCHEMA_VERSION,
    id: newId(),
    name: cleanEventName(name) || "Untitled event",
    dimensions: dimensions ?? { ...DEFAULT_FLOOR_PLAN_SIZE },
    tables: [],
    guests: [],
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
 * copied with fresh ids; guests and their seat assignments are opt-in, with
 * assignments remapped onto the cloned seat ids.
 */
export function duplicateEventDoc(source: EventDoc, options: DuplicateOptions = {}): EventDoc {
  const timestamp = options.now ?? new Date().toISOString();
  const seatIdMap = new Map<string, string>();

  const tables = source.tables.map((table) => ({
    ...table,
    id: newId(),
    seats: table.seats.map((seat) => {
      const id = newId();
      seatIdMap.set(seat.id, id);
      return { ...seat, id };
    }),
  }));

  const guests = options.copyGuests
    ? source.guests.map((guest) => ({
        ...guest,
        id: newId(),
        seatId:
          options.copyAssignments && guest.seatId ? (seatIdMap.get(guest.seatId) ?? null) : null,
      }))
    : [];

  return {
    ...source,
    id: newId(),
    name: `${source.name} (copy)`.slice(0, MAX_EVENT_NAME_LENGTH),
    tables,
    guests,
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
