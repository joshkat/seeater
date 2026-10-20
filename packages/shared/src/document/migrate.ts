import {
  EVENT_DOC_SCHEMA_VERSION,
  type EventDoc,
  eventDocSchema,
  eventDocShapeSchema,
} from "./schema.js";

/** Thrown when untrusted input (a sync pull, a backup file) isn't a valid document. */
export class EventDocError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventDocError";
  }
}

type RawDoc = Record<string, unknown>;

/**
 * Upgrade steps keyed by the version they upgrade FROM. Each step only adds or
 * reshapes fields; validation happens afterwards in `parseEventDoc`.
 */
const UPGRADES: Record<number, (doc: RawDoc) => RawDoc> = {
  // v2: households. Every guest starts outside a household.
  1: (doc) => ({
    ...doc,
    schemaVersion: 2,
    households: [],
    guests: Array.isArray(doc.guests)
      ? doc.guests.map((guest: unknown) =>
          typeof guest === "object" && guest !== null ? { ...guest, householdId: null } : guest,
        )
      : doc.guests,
  }),
  // v3: per-event settings. Exact seat placement starts on "auto".
  2: (doc) => ({ ...doc, schemaVersion: 3, settings: { exactSeatPlacement: "auto" } }),
  // v4: more detail per guest, all empty to start.
  3: (doc) => ({
    ...doc,
    schemaVersion: 4,
    guests: Array.isArray(doc.guests)
      ? doc.guests.map((guest: unknown) =>
          typeof guest === "object" && guest !== null
            ? {
                ...guest,
                meal: null,
                dietary: null,
                accessibility: null,
                notes: null,
                tags: [],
                isChild: false,
              }
            : guest,
        )
      : doc.guests,
  }),
};

/**
 * Runs the upgrade steps on a stored or received document, without validating
 * it. Throws EventDocError if it isn't a document or comes from a newer app.
 * Current-version input is returned as-is (same object).
 */
export function upgradeEventDoc(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) {
    throw new EventDocError("Not an event document");
  }
  let doc = raw as Record<string, unknown>;
  let version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : NaN;
  if (!Number.isInteger(version)) throw new EventDocError("Missing schemaVersion");
  if (version > EVENT_DOC_SCHEMA_VERSION) {
    throw new EventDocError(
      `Document uses schema v${version}; this app understands up to v${EVENT_DOC_SCHEMA_VERSION}. Update the app.`,
    );
  }
  while (version < EVENT_DOC_SCHEMA_VERSION) {
    const step = UPGRADES[version];
    if (!step) throw new EventDocError(`No upgrade path from schema v${version}`);
    doc = step(doc);
    version += 1;
  }
  return doc;
}

/** Re-sorts each table's seats by index and renumbers them 0..n-1. */
export function normalizeEventDoc(doc: EventDoc): EventDoc {
  return {
    ...doc,
    tables: doc.tables.map((table) => ({
      ...table,
      seats: [...table.seats]
        .sort((a, b) => a.index - b.index)
        .map((seat, index) => ({ ...seat, index })),
    })),
  };
}

/**
 * Turns untrusted JSON into a valid, current-version EventDoc: upgrades old
 * schema versions, validates shape, normalizes seat order, then checks
 * integrity. Throws EventDocError with a readable message on failure.
 */
export function parseEventDoc(raw: unknown): EventDoc {
  const shaped = eventDocShapeSchema.safeParse(upgradeEventDoc(raw));
  if (!shaped.success) {
    throw new EventDocError(`Invalid event document: ${shaped.error.issues[0]?.message}`);
  }
  const checked = eventDocSchema.safeParse(normalizeEventDoc(shaped.data));
  if (!checked.success) {
    throw new EventDocError(`Inconsistent event document: ${checked.error.issues[0]?.message}`);
  }
  return checked.data;
}
