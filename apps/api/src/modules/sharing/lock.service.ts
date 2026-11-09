import { EDIT_LOCK_TTL_MS, type LockResponse, type LockStatusResponse } from "@seating/shared";

import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { Caller } from "../../lib/auth.js";
import { accessFor, canWrite, forbidden, notFound } from "../events/access.js";

/**
 * "One editor at a time": an advisory lock per event, held by one browser
 * tab (`clientId`) and renewed while it edits. It only steers the UI (others
 * open the event read-only); writes are still compare-and-swap, so a clash
 * after "Edit anyway" or offline editing falls back to a conflicted copy.
 */
export class LockService {
  constructor(private readonly prisma: PrismaClient) {}

  private async requireWriter(caller: Caller, eventId: string): Promise<void> {
    const access = await accessFor(this.prisma, caller.userId, eventId);
    if (!access) throw notFound();
    if (!canWrite(access.role)) throw forbidden();
  }

  async status(caller: Caller, eventId: string, now = new Date()): Promise<LockStatusResponse> {
    const access = await accessFor(this.prisma, caller.userId, eventId);
    if (!access) throw notFound();
    const lock = await this.prisma.eventLock.findUnique({ where: { eventId } });
    if (!lock || lock.expiresAt <= now) return { holder: null, expiresAt: null };
    return {
      holder: { userId: lock.userId, name: lock.displayName, isYou: lock.userId === caller.userId },
      expiresAt: lock.expiresAt.toISOString(),
    };
  }

  /**
   * Takes or renews the lock. It's ours if nobody holds it, it expired, this
   * tab already holds it, or `force`. One atomic statement each way, so two
   * tabs racing can't both win.
   */
  async acquire(
    caller: Caller,
    eventId: string,
    clientId: string,
    force = false,
    now = new Date(),
  ): Promise<LockResponse> {
    await this.requireWriter(caller, eventId);
    const expiresAt = new Date(now.getTime() + EDIT_LOCK_TTL_MS);
    const data = { userId: caller.userId, displayName: caller.name, clientId, expiresAt };

    try {
      await this.prisma.eventLock.create({ data: { eventId, ...data } });
      return { held: true, expiresAt: expiresAt.toISOString() };
    } catch (error) {
      const taken = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!taken) throw error;
    }

    const { count } = await this.prisma.eventLock.updateMany({
      where: force
        ? { eventId }
        : {
            eventId,
            OR: [{ expiresAt: { lte: now } }, { userId: caller.userId, clientId }],
          },
      data,
    });
    if (count === 1) return { held: true, expiresAt: expiresAt.toISOString() };

    const lock = await this.prisma.eventLock.findUnique({ where: { eventId } });
    if (!lock) return this.acquire(caller, eventId, clientId, force, now);
    return {
      held: false,
      holder: { userId: lock.userId, name: lock.displayName, isYou: lock.userId === caller.userId },
      expiresAt: lock.expiresAt.toISOString(),
    };
  }

  /** Lets go of the lock if this tab holds it. */
  async release(caller: Caller, eventId: string, clientId: string): Promise<void> {
    await this.prisma.eventLock.deleteMany({
      where: { eventId, userId: caller.userId, clientId },
    });
  }
}
