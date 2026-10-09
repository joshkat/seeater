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

/**
 * Upgrade steps keyed by the version they upgrade FROM. When v2 ships, add
 * `1: (doc) => ({ ...doc, schemaVersion: 2, newField: default })`.
 */
const UPGRADES: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {};

function upgrade(raw: unknown): unknown {
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
  const shaped = eventDocShapeSchema.safeParse(upgrade(raw));
  if (!shaped.success) {
    throw new EventDocError(`Invalid event document: ${shaped.error.issues[0]?.message}`);
  }
  const checked = eventDocSchema.safeParse(normalizeEventDoc(shaped.data));
  if (!checked.success) {
    throw new EventDocError(`Inconsistent event document: ${checked.error.issues[0]?.message}`);
  }
  return checked.data;
}
