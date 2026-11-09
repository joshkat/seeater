import {
  EVENT_DOC_SCHEMA_VERSION,
  type EventDoc,
  type EventRole,
  type EventSummary,
  upgradeEventDoc,
} from "@seating/shared";
import Dexie, { type Table, type Transaction } from "dexie";

/**
 * Per-document sync bookkeeping. Only meaningful in an account scope; in the
 * signed-out scope it's carried along so documents can be uploaded later.
 */
export interface SyncMeta {
  /** Server version this local copy was last reconciled with; null = never synced. */
  baseVersion: number | null;
  /** True when there are local changes the server hasn't accepted yet. */
  dirty: boolean;
  /** True when deleted locally but the delete hasn't reached the server yet. */
  deleted: boolean;
  /**
   * The signed-in user's access, from the server's list. Absent = "owner"
   * (every record from before sharing, and every event made on this device).
   */
  role?: EventRole;
  /** Owner's display name, for "Shared by …" on events shared with you. */
  ownerName?: string;
  /** How many people the owner shared it with (owner's records only). */
  memberCount?: number;
}

/** The record's role, treating records from before sharing as owned. */
export const recordRole = (sync: SyncMeta): EventRole => sync.role ?? "owner";

/** One row of the `events` store: a whole event document plus metadata. */
export interface LocalEventRecord {
  id: string;
  /** The document. Null only for a pending-delete tombstone. */
  doc: EventDoc | null;
  /** Precomputed dashboard tile data, so listing never loads full documents. */
  summary: EventSummary;
  /** Mirrors doc.updatedAt; indexed for "most recent first" listing. */
  updatedAt: string;
  sync: SyncMeta;
  /**
   * When the event was moved to the trash (ISO), or null/absent if it isn't.
   * Trashed events keep their document and are purged after 30 days.
   */
  trashedAt?: string | null;
}

/** Why a version was saved. */
export type VersionKind = "auto" | "named";

/**
 * A saved version of an event (version history). Local to this device:
 * versions aren't synced or included in backups.
 */
export interface EventVersionRecord {
  id: string;
  eventId: string;
  /** ISO time the version was taken; indexed with eventId for listing. */
  createdAt: string;
  kind: VersionKind;
  /** Named: what the user called it. Auto: why it was taken ("Opened", …). */
  label: string;
  /** The document as it was. May be an older schema version — parse before use. */
  doc: EventDoc;
  summary: EventSummary;
}

/**
 * A floor-plan picture (kept out of the event document so documents stay
 * small). Stored as bytes so it survives every IndexedDB implementation.
 */
export interface StoredImageRecord {
  id: string;
  /** The event it was uploaded to (deleted with it). */
  eventId: string;
  data: ArrayBuffer;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
  /**
   * Events whose server copy already has these bytes (signed-in sync only).
   * A list, because a duplicated event references the same picture.
   */
  uploadedTo?: string[];
}

/**
 * Bump when object stores or indexes change. The Dexie version combines it
 * with the document schema version, so either kind of change upgrades every
 * database once (see the constructor).
 */
const STORE_LAYOUT_VERSION = 2;

/** Dexie version: store layout × 100 + document schema version (e.g. 103). */
export const DATABASE_VERSION = STORE_LAYOUT_VERSION * 100 + EVENT_DOC_SCHEMA_VERSION;

/**
 * The app's IndexedDB database. There is one per storage scope (signed-out,
 * or one per signed-in account — see scope.ts), with an `events` store keyed
 * by document id, a `versions` store for version history and an `images`
 * store for floor-plan pictures.
 */
export class SeatingDb extends Dexie {
  events!: Table<LocalEventRecord, string>;
  versions!: Table<EventVersionRecord, string>;
  images!: Table<StoredImageRecord, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      // Primary key `id`; secondary index on `updatedAt`.
      events: "id, updatedAt",
    });
    // Bumping EVENT_DOC_SCHEMA_VERSION or STORE_LAYOUT_VERSION raises this
    // version, so Dexie runs the upgrade once per database: it creates any new
    // stores and brings every stored document up to the current schema.
    this.version(DATABASE_VERSION)
      .stores({
        events: "id, updatedAt",
        versions: "id, eventId, [eventId+createdAt]",
        images: "id, eventId",
      })
      .upgrade(upgradeStoredDocs);
  }
}

/** Upgrades every stored document in place. A document that can't be
 * upgraded is left as it was rather than blocking the database from opening. */
async function upgradeStoredDocs(tx: Transaction): Promise<void> {
  await tx
    .table<LocalEventRecord, string>("events")
    .toCollection()
    .modify((record) => {
      if (!record.doc) return;
      try {
        record.doc = upgradeEventDoc(record.doc) as EventDoc;
      } catch (error) {
        console.error(`Could not upgrade stored event ${record.id}`, error);
      }
    });
}
