import { Prisma, type PrismaClient } from "@prisma/client";
import type { EventDoc, RemoteEvent, RemoteEventSummary } from "@seating/shared";

/** Outcome of a conditional write. On conflict, `current` is what the server holds. */
export type WriteResult =
  | { ok: true; version: number }
  | { ok: false; current: { version: number; deleted: boolean } };

type Row = Prisma.EventDocumentGetPayload<object>;

function toSummary(row: Pick<Row, "id" | "name" | "version" | "deletedAt" | "updatedAt">) {
  const summary: RemoteEventSummary = {
    id: row.id,
    name: row.name,
    version: row.version,
    deleted: row.deletedAt !== null,
    updatedAt: row.updatedAt.toISOString(),
  };
  return summary;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Storage for synced event documents. Every query is scoped by `ownerId`
 * through the composite primary key, so one user can never read or overwrite
 * another's rows. Writes are compare-and-swap on `version`: a single
 * `updateMany ... WHERE version = baseVersion` either wins atomically or
 * matches zero rows, which we report as a conflict.
 */
export class EventDocumentService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(ownerId: string): Promise<RemoteEventSummary[]> {
    const rows = await this.prisma.eventDocument.findMany({
      where: { ownerId },
      select: { id: true, name: true, version: true, deletedAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toSummary);
  }

  async get(ownerId: string, id: string): Promise<RemoteEvent | null> {
    const row = await this.prisma.eventDocument.findUnique({
      where: { ownerId_id: { ownerId, id } },
    });
    if (!row) return null;
    return {
      ...toSummary(row),
      data: row.data as EventDoc | null,
    };
  }

  private async current(ownerId: string, id: string) {
    const row = await this.prisma.eventDocument.findUnique({
      where: { ownerId_id: { ownerId, id } },
      select: { version: true, deletedAt: true },
    });
    return row ? { version: row.version, deleted: row.deletedAt !== null } : null;
  }

  private async create(ownerId: string, doc: EventDoc): Promise<WriteResult> {
    try {
      await this.prisma.eventDocument.create({
        data: { ownerId, id: doc.id, name: doc.name, version: 1, data: doc },
      });
      return { ok: true, version: 1 };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const current = await this.current(ownerId, doc.id);
      return { ok: false, current: current ?? { version: 0, deleted: false } };
    }
  }

  /**
   * Writes a whole document. `baseVersion: null` creates it (conflict if it
   * already exists). Otherwise the write lands only if the stored version still
   * equals `baseVersion`; writing over a tombstone at its current version
   * restores the document.
   */
  async put(ownerId: string, baseVersion: number | null, doc: EventDoc): Promise<WriteResult> {
    if (baseVersion === null) return this.create(ownerId, doc);

    const { count } = await this.prisma.eventDocument.updateMany({
      where: { ownerId, id: doc.id, version: baseVersion },
      data: { name: doc.name, data: doc, deletedAt: null, version: { increment: 1 } },
    });
    if (count === 1) return { ok: true, version: baseVersion + 1 };

    const current = await this.current(ownerId, doc.id);
    // The client had synced this before but the row is gone (e.g. a wiped
    // database). Treat it as a fresh create rather than stranding the data.
    if (!current) return this.create(ownerId, doc);
    return { ok: false, current };
  }

  /**
   * Deletes a document at `baseVersion`, leaving a tombstone (data cleared).
   * Deleting something that doesn't exist succeeds, so retries are safe.
   */
  async remove(ownerId: string, id: string, baseVersion: number): Promise<WriteResult> {
    const { count } = await this.prisma.eventDocument.updateMany({
      where: { ownerId, id, version: baseVersion },
      data: { data: Prisma.DbNull, deletedAt: new Date(), version: { increment: 1 } },
    });
    if (count === 1) return { ok: true, version: baseVersion + 1 };

    const current = await this.current(ownerId, id);
    if (!current) return { ok: true, version: 0 };
    return { ok: false, current };
  }
}
