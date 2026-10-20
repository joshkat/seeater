import { z } from "zod";

import { MAX_SEAT_COUNT } from "../geometry/constants.js";
import { checkEventDocIntegrity } from "./integrity.js";

/**
 * The event document — the single unit of storage for the whole app.
 *
 * One seating chart (layout + guest list + seat assignments) is one JSON
 * document. The browser keeps it in IndexedDB; the optional sync API stores the
 * same JSON verbatim. These zod schemas are the source of truth for its shape:
 * the TypeScript types below are inferred from them, the API validates uploads
 * with them, and the web app validates anything it reads back (sync pulls,
 * backup files) with them.
 *
 * Bump EVENT_DOC_SCHEMA_VERSION and add an upgrade step in `migrate.ts` whenever
 * the shape changes in a way old documents don't already satisfy.
 */
export const EVENT_DOC_SCHEMA_VERSION = 5;

/** Upper bounds that keep a single document comfortably small (well under 5 MB). */
export const MAX_TABLES = 500;
export const MAX_GUESTS = 5000;
export const MAX_EVENT_NAME_LENGTH = 120;
export const MAX_TABLE_LABEL_LENGTH = 80;
export const MAX_GUEST_NAME_LENGTH = 120;
export const MAX_GUEST_EMAIL_LENGTH = 200;
export const MAX_GUEST_PHONE_LENGTH = 40;
export const MAX_HOUSEHOLD_NAME_LENGTH = 120;
export const MAX_MEAL_LENGTH = 60;
export const MAX_GUEST_NOTE_LENGTH = 1000;
export const MAX_GUEST_NEED_LENGTH = 200;
export const MAX_TAG_LENGTH = 40;
export const MAX_TAGS_PER_GUEST = 20;
export const MAX_LAYOUTS = 20;
export const MAX_LAYOUT_NAME_LENGTH = 60;

const idSchema = z.string().min(1).max(64);
const isoDateSchema = z.iso.datetime({ offset: true });
const nonBlank = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, "Must not be blank");

export const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const sizeSchema = z.object({
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});

/**
 * A chair. In `auto` layouts its position is derived from `index` and the
 * table geometry (`offset` is null); in `custom` layouts `offset` holds its
 * position relative to the table center, before rotation. `index` always equals
 * the seat's position in its table's `seats` array.
 */
export const seatSchema = z.object({
  id: idSchema,
  index: z.number().int().min(0),
  /** Optional human label, e.g. "1A". The UI falls back to `index + 1`. */
  label: z.string().max(40).nullable(),
  offset: pointSchema.nullable(),
});

export const tableShapeSchema = z.enum(["round", "rectangle"]);
export const chairLayoutModeSchema = z.enum(["auto", "custom"]);

export const tableSchema = z.object({
  id: idSchema,
  label: z.string().max(MAX_TABLE_LABEL_LENGTH),
  shape: tableShapeSchema,
  /** Center of the table within the floor plan. */
  position: pointSchema,
  /** Degrees, clockwise, about the table center. */
  rotation: z.number().finite(),
  /** Bounding size; for round tables width === height (the diameter). */
  size: sizeSchema,
  chairLayoutMode: chairLayoutModeSchema,
  seats: z.array(seatSchema).max(MAX_SEAT_COUNT),
});

export const rsvpStatusSchema = z.enum(["pending", "accepted", "declined"]);

export const guestSchema = z.object({
  id: idSchema,
  name: nonBlank(MAX_GUEST_NAME_LENGTH),
  email: z.string().max(MAX_GUEST_EMAIL_LENGTH).nullable(),
  phone: z.string().max(MAX_GUEST_PHONE_LENGTH).nullable(),
  rsvpStatus: rsvpStatusSchema,
  /** The seat this guest occupies, if any. A seat holds at most one guest. */
  seatId: idSchema.nullable(),
  /** The household (family / party) this guest belongs to, if any. */
  householdId: idSchema.nullable(),
  /** Meal choice, e.g. "Chicken". Free text; matched case-insensitively to
   * other guests' meals so totals group correctly. */
  meal: z.string().max(MAX_MEAL_LENGTH).nullable(),
  /** Dietary needs and allergies, e.g. "Nut allergy". */
  dietary: z.string().max(MAX_GUEST_NEED_LENGTH).nullable(),
  /** Accessibility needs, e.g. "Wheelchair — aisle seat". */
  accessibility: z.string().max(MAX_GUEST_NEED_LENGTH).nullable(),
  notes: z.string().max(MAX_GUEST_NOTE_LENGTH).nullable(),
  /** Groups such as "Bride's side", "Family", "Work". */
  tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS_PER_GUEST),
  isChild: z.boolean(),
});

/**
 * A household (family, couple, party): guests who should be seated together.
 * Membership lives on the guest (`householdId`); the ops drop a household once
 * it has no members.
 */
export const householdSchema = z.object({
  id: idSchema,
  name: nonBlank(MAX_HOUSEHOLD_NAME_LENGTH),
});

/**
 * How seating several guests at a table behaves: `on` opens the seat-by-seat
 * placement dialog, `off` auto-fills open seats, `auto` picks per event size
 * (on for events with 2 or fewer tables). See `isExactSeatPlacement`.
 */
export const exactSeatPlacementSchema = z.enum(["auto", "on", "off"]);

/** Per-event preferences that travel with the document. */
export const eventSettingsSchema = z.object({
  exactSeatPlacement: exactSeatPlacementSchema,
});

/**
 * An inactive layout's content: its own floor plan, tables and seating
 * (guest id → seat id). The guest list is shared by every layout.
 */
export const storedLayoutSchema = z.object({
  dimensions: sizeSchema,
  tables: z.array(tableSchema).max(MAX_TABLES),
  seating: z.record(idSchema, idSchema),
});

/**
 * One layout of the event (e.g. "Ceremony", "Reception"). The active layout's
 * content lives in the document's top-level `dimensions`, `tables` and each
 * guest's `seatId` — so every edit works on it unchanged — and its `stored`
 * is null. Every other layout keeps its content in `stored`.
 */
export const layoutSchema = z.object({
  id: idSchema,
  name: nonBlank(MAX_LAYOUT_NAME_LENGTH),
  stored: storedLayoutSchema.nullable(),
});

/** Shape-only schema (no cross-reference checks). Used before normalizing. */
export const eventDocShapeSchema = z.object({
  schemaVersion: z.literal(EVENT_DOC_SCHEMA_VERSION),
  id: idSchema,
  name: nonBlank(MAX_EVENT_NAME_LENGTH),
  /** Size of the editable floor-plan area, in floor-plan units. */
  dimensions: sizeSchema,
  tables: z.array(tableSchema).max(MAX_TABLES),
  guests: z.array(guestSchema).max(MAX_GUESTS),
  households: z.array(householdSchema).max(MAX_GUESTS),
  settings: eventSettingsSchema,
  layouts: z.array(layoutSchema).min(1).max(MAX_LAYOUTS),
  activeLayoutId: idSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

/** The full schema: shape plus integrity (unique ids, valid seat references). */
export const eventDocSchema = eventDocShapeSchema.superRefine(checkEventDocIntegrity);

export type Seat = z.infer<typeof seatSchema>;
export type TableShape = z.infer<typeof tableShapeSchema>;
export type ChairLayoutMode = z.infer<typeof chairLayoutModeSchema>;
export type Table = z.infer<typeof tableSchema>;
export type RsvpStatus = z.infer<typeof rsvpStatusSchema>;
export type Guest = z.infer<typeof guestSchema>;
export type Household = z.infer<typeof householdSchema>;
export type ExactSeatPlacement = z.infer<typeof exactSeatPlacementSchema>;
export type EventSettings = z.infer<typeof eventSettingsSchema>;
export type StoredLayout = z.infer<typeof storedLayoutSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type EventDoc = z.infer<typeof eventDocShapeSchema>;
