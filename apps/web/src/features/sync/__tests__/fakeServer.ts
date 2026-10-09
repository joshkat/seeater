import type { EventDoc, RemoteEvent } from "@seating/shared";

import type { RemoteWriteResult, SyncApi } from "../api/syncApi";

interface Row {
  version: number;
  deleted: boolean;
  data: EventDoc | null;
}

/**
 * In-memory stand-in for the sync API with the same compare-and-swap rules as
 * apps/api's EventDocumentService (create-if-absent, write-if-version-matches,
 * tombstone deletes). Documents are deep-copied to mimic JSON over the wire.
 */
export class FakeServer implements SyncApi {
  readonly rows = new Map<string, Row>();
  /** Set to make every call fail like an unreachable server. */
  offline = false;

  private check(): void {
    if (this.offline) throw new TypeError("Failed to fetch");
  }

  private conflict(id: string): RemoteWriteResult {
    const row = this.rows.get(id)!;
    return { ok: false, current: { version: row.version, deleted: row.deleted } };
  }

  /** Simulates another device writing directly to the server. */
  seed(doc: EventDoc, version = 1): void {
    this.rows.set(doc.id, { version, deleted: false, data: structuredClone(doc) });
  }

  list = async () => {
    this.check();
    return {
      events: [...this.rows.entries()].map(([id, row]) => ({
        id,
        name: row.data?.name ?? "",
        version: row.version,
        deleted: row.deleted,
        updatedAt: row.data?.updatedAt ?? new Date(0).toISOString(),
      })),
    };
  };

  get = async (id: string): Promise<RemoteEvent> => {
    this.check();
    const row = this.rows.get(id);
    if (!row) throw new Error(`404 ${id}`);
    return {
      id,
      version: row.version,
      deleted: row.deleted,
      updatedAt: row.data?.updatedAt ?? "",
      data: structuredClone(row.data),
    };
  };

  put = async (doc: EventDoc, baseVersion: number | null): Promise<RemoteWriteResult> => {
    this.check();
    const row = this.rows.get(doc.id);
    if (!row || (baseVersion !== null && row.version === baseVersion)) {
      const version = row ? row.version + 1 : 1;
      if (row && baseVersion === null) return this.conflict(doc.id);
      this.rows.set(doc.id, { version, deleted: false, data: structuredClone(doc) });
      return { ok: true, version };
    }
    return this.conflict(doc.id);
  };

  remove = async (id: string, baseVersion: number): Promise<RemoteWriteResult> => {
    this.check();
    const row = this.rows.get(id);
    if (!row) return { ok: true, version: 0 };
    if (row.version !== baseVersion) return this.conflict(id);
    this.rows.set(id, { version: row.version + 1, deleted: true, data: null });
    return { ok: true, version: row.version + 1 };
  };
}
