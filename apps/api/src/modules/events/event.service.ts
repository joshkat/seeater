import type { EventDoc, RemoteEvent, RemoteEventSummary } from "@seating/shared";

import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { Caller } from "../../lib/auth.js";
import { accessFor, canWrite, claimInvites, forbidden, notFound } from "./access.js";

/** Outcome of a conditional write. On conflict, `current` is what the server holds. */
export type WriteResult =
  | { ok: true; version: number }
  | { ok: false; current: { version: number; deleted: boolean }; reason?: "idTaken" };

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** A create (or write) hit an id that belongs to someone else's event. */
const ID_TAKEN: WriteResult = {
  ok: false,
  current: { version: 0, deleted: false },
  reason: "idTaken",
};

/**
 * Storage for synced event documents. Event ids are global; who may read or
 * write a row is decided by `accessFor` (owner / editor / viewer). Writes are
 * compare-and-swap on `version`: a single `updateMany ... WHERE version =
 * baseVersion` either wins atomically or matches zero rows (a conflict).
 */
export class EventDocumentService {
  constructor(private readonly prisma: PrismaClient) {}

  /** The caller's own events and those shared with them, including tombstones. */
  async list(caller: Caller): Promise<RemoteEventSummary[]> {
    await claimInvites(this.prisma, caller);
    const rows = await this.prisma.eventDocument.findMany({
      where: {
        OR: [{ ownerId: caller.userId }, { members: { some: { userId: caller.userId } } }],
      },
      select: {
        id: true,
        name: true,
        version: true,
        deletedAt: true,
        updatedAt: true,
        ownerId: true,
        ownerName: true,
        members: { select: { userId: true, role: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => {
      const mine = row.ownerId === caller.userId;
      const membership = row.members.find((member) => member.userId === caller.userId);
      return {
        id: row.id,
        name: row.name,
        version: row.version,
        deleted: row.deletedAt !== null,
        updatedAt: row.updatedAt.toISOString(),
        role: mine ? "owner" : (membership?.role ?? "viewer"),
        ownerName: row.ownerName,
        memberCount: mine ? row.members.length : 0,
      };
    });
  }

  async get(caller: Caller, id: string): Promise<RemoteEvent> {
    const access = await accessFor(this.prisma, caller.userId, id);
    if (!access) throw notFound();
    const row = await this.prisma.eventDocument.findUniqueOrThrow({ where: { id } });
    return {
      id: row.id,
      version: row.version,
      deleted: row.deletedAt !== null,
      updatedAt: row.updatedAt.toISOString(),
      data: row.data as EventDoc | null,
    };
  }

  private async current(id: string) {
    const row = await this.prisma.eventDocument.findUnique({
      where: { id },
      select: { version: true, deletedAt: true },
    });
    return row ? { version: row.version, deleted: row.deletedAt !== null } : null;
  }

  private async create(caller: Caller, doc: EventDoc): Promise<WriteResult> {
    try {
      await this.prisma.eventDocument.create({
        data: {
          id: doc.id,
          ownerId: caller.userId,
          ownerName: caller.name,
          name: doc.name,
          version: 1,
          data: doc,
        },
      });
      return { ok: true, version: 1 };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Someone created it first. If it's visible to the caller, it's an
      // ordinary conflict; otherwise the id belongs to a stranger's event.
      const access = await accessFor(this.prisma, caller.userId, doc.id);
      if (!access) return ID_TAKEN;
      const current = await this.current(doc.id);
      return { ok: false, current: current ?? { version: 0, deleted: false } };
    }
  }

  /**
   * Writes a whole document. `baseVersion: null` creates it (conflict if it
   * already exists). Otherwise the write lands only if the stored version still
   * equals `baseVersion`; writing over a tombstone at its current version
   * restores the document. Owners and editors may write; viewers get a 403.
   */
  async put(caller: Caller, baseVersion: number | null, doc: EventDoc): Promise<WriteResult> {
    const access = await accessFor(this.prisma, caller.userId, doc.id);
    if (access && !canWrite(access.role)) throw forbidden();
    if (baseVersion === null) return this.create(caller, doc);
    if (!access) {
      // Never synced by anyone visible to the caller. A row that exists
      // belongs to a stranger; a missing row (e.g. a wiped database) is
      // re-created rather than stranding the data.
      return (await this.current(doc.id)) ? ID_TAKEN : this.create(caller, doc);
    }

    const { count } = await this.prisma.eventDocument.updateMany({
      where: { id: doc.id, version: baseVersion },
      data: {
        name: doc.name,
        data: doc,
        deletedAt: null,
        version: { increment: 1 },
        ...(access.role === "owner" ? { ownerName: caller.name } : {}),
      },
    });
    if (count === 1) return { ok: true, version: baseVersion + 1 };

    const current = await this.current(doc.id);
    if (!current) return this.create(caller, doc);
    return { ok: false, current };
  }

  /**
   * Deletes a document at `baseVersion`, leaving a tombstone (data cleared) so
   * every device and collaborator learns of it. Owner only; collaborators
   * leave instead. Deleting something the caller can't see succeeds, so
   * retries are safe.
   */
  async remove(caller: Caller, id: string, baseVersion: number): Promise<WriteResult> {
    const access = await accessFor(this.prisma, caller.userId, id);
    if (!access) return { ok: true, version: 0 };
    if (access.role !== "owner") throw forbidden("Only the owner can delete this event");

    const { count } = await this.prisma.eventDocument.updateMany({
      where: { id, version: baseVersion },
      data: {
        data: Prisma.DbNull,
        deletedAt: new Date(),
        shareEnabled: false,
        version: { increment: 1 },
      },
    });
    if (count === 1) {
      await this.prisma.eventLock.deleteMany({ where: { eventId: id } });
      await this.prisma.eventImage.deleteMany({ where: { eventId: id } });
      return { ok: true, version: baseVersion + 1 };
    }

    const current = await this.current(id);
    if (!current) return { ok: true, version: 0 };
    return { ok: false, current };
  }
}
