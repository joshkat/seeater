import type { EventDoc, EventSummary } from "@seating/shared";
import Dexie, { type Table } from "dexie";

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
}

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
}

/**
 * The app's IndexedDB database. There is one per storage scope (signed-out,
 * or one per signed-in account — see scope.ts), each with a single `events`
 * object store keyed by document id.
 */
export class SeatingDb extends Dexie {
  events!: Table<LocalEventRecord, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      // Primary key `id`; secondary index on `updatedAt`.
      events: "id, updatedAt",
    });
  }
}
