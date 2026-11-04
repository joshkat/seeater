import { randomBytes } from "node:crypto";

import {
  MAX_EVENT_MEMBERS,
  type MemberRole,
  type SharedEventResponse,
  type SharingResponse,
  type ShareLinkState,
  parseEventDoc,
} from "@seating/shared";

import type { PrismaClient } from "../../generated/prisma/client.js";
import type { Caller } from "../../lib/auth.js";
import { accessFor, canWrite, forbidden, notFound } from "../events/access.js";

function badRequest(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
}

/** 256 bits, URL-safe: unguessable, so the link itself is the permission. */
export function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Invites (by email, as editor or viewer) and the public read-only link.
 * Only the owner changes sharing; editors may see who else has access.
 */
export class SharingService {
  constructor(private readonly prisma: PrismaClient) {}

  private async requireOwner(caller: Caller, eventId: string): Promise<void> {
    const access = await accessFor(this.prisma, caller.userId, eventId);
    if (!access) throw notFound();
    if (access.role !== "owner") throw forbidden("Only the owner can change sharing");
  }

  async get(caller: Caller, eventId: string): Promise<SharingResponse> {
    const access = await accessFor(this.prisma, caller.userId, eventId);
    if (!access) throw notFound();
    if (!canWrite(access.role)) throw forbidden("Viewers can't see who an event is shared with");
    const row = await this.prisma.eventDocument.findUniqueOrThrow({
      where: { id: eventId },
      select: {
        ownerName: true,
        shareEnabled: true,
        shareToken: true,
        members: { orderBy: { createdAt: "asc" } },
      },
    });
    return {
      ownerName: row.ownerName,
      members: row.members.map((member) => ({
        email: member.email,
        role: member.role,
        accepted: member.userId !== null,
      })),
      link: access.role === "owner" ? { enabled: row.shareEnabled, token: row.shareToken } : null,
    };
  }

  async invite(caller: Caller, eventId: string, email: string, role: MemberRole): Promise<void> {
    await this.requireOwner(caller, eventId);
    if (caller.email && email === caller.email) {
      throw badRequest("That's your own email: you already own this event");
    }
    const count = await this.prisma.eventMember.count({ where: { eventId } });
    const existing = await this.prisma.eventMember.findUnique({
      where: { eventId_email: { eventId, email } },
    });
    if (!existing && count >= MAX_EVENT_MEMBERS) {
      throw badRequest(`An event can be shared with at most ${MAX_EVENT_MEMBERS} people`);
    }
    await this.prisma.eventMember.upsert({
      where: { eventId_email: { eventId, email } },
      create: { eventId, email, role, invitedBy: caller.userId },
      update: { role },
    });
  }

  async updateRole(caller: Caller, eventId: string, email: string, role: MemberRole) {
    await this.requireOwner(caller, eventId);
    const { count } = await this.prisma.eventMember.updateMany({
      where: { eventId, email },
      data: { role },
    });
    if (count === 0) throw notFound();
    // A demoted editor loses the edit lock straight away.
    if (role === "viewer") await this.releaseLocksOf(eventId, email);
  }

  async removeMember(caller: Caller, eventId: string, email: string): Promise<void> {
    await this.requireOwner(caller, eventId);
    await this.releaseLocksOf(eventId, email);
    await this.prisma.eventMember.deleteMany({ where: { eventId, email } });
  }

  /** A collaborator removes a shared event from their own list. */
  async leave(caller: Caller, eventId: string): Promise<void> {
    await this.prisma.eventLock.deleteMany({ where: { eventId, userId: caller.userId } });
    await this.prisma.eventMember.deleteMany({ where: { eventId, userId: caller.userId } });
  }

  private async releaseLocksOf(eventId: string, email: string): Promise<void> {
    const member = await this.prisma.eventMember.findUnique({
      where: { eventId_email: { eventId, email } },
      select: { userId: true },
    });
    if (member?.userId) {
      await this.prisma.eventLock.deleteMany({ where: { eventId, userId: member.userId } });
    }
  }

  /** Turns the public link on or off; `regenerate` invalidates the old one. */
  async setLink(
    caller: Caller,
    eventId: string,
    enabled: boolean,
    regenerate = false,
  ): Promise<ShareLinkState> {
    await this.requireOwner(caller, eventId);
    const row = await this.prisma.eventDocument.findUniqueOrThrow({
      where: { id: eventId },
      select: { shareToken: true, deletedAt: true },
    });
    if (enabled && row.deletedAt) throw badRequest("This event was deleted");
    const token = regenerate || (enabled && !row.shareToken) ? newShareToken() : row.shareToken;
    await this.prisma.eventDocument.update({
      where: { id: eventId },
      data: { shareEnabled: enabled, shareToken: token },
    });
    return { enabled, token };
  }

  /** The id of the event behind a working public link, or null. */
  async eventIdForToken(token: string): Promise<string | null> {
    const row = await this.prisma.eventDocument.findUnique({
      where: { shareToken: token },
      select: { id: true, shareEnabled: true, deletedAt: true },
    });
    return row && row.shareEnabled && !row.deletedAt ? row.id : null;
  }

  /** What a public link shows. Throws 404 when the link is off or unknown. */
  async shared(token: string): Promise<SharedEventResponse> {
    const row = await this.prisma.eventDocument.findUnique({ where: { shareToken: token } });
    if (!row || !row.shareEnabled || row.deletedAt || !row.data) throw notFound();
    return {
      id: row.id,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      ownerName: row.ownerName,
      data: parseEventDoc(row.data),
    };
  }
}
