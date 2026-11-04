import type { EventRole } from "@seating/shared";

import type { PrismaClient } from "../../generated/prisma/client.js";
import type { Caller } from "../../lib/auth.js";

/**
 * Who may do what with an event. One place, so every route asks the same
 * question the same way:
 *
 *   owner   read, write, delete, manage sharing
 *   editor  read, write, see who it's shared with
 *   viewer  read
 *   (none)  nothing: the event looks like it doesn't exist (404)
 */
export interface EventAccess {
  role: EventRole;
  ownerId: string;
}

export async function accessFor(
  prisma: PrismaClient,
  userId: string,
  eventId: string,
): Promise<EventAccess | null> {
  const row = await prisma.eventDocument.findUnique({
    where: { id: eventId },
    select: { ownerId: true, members: { where: { userId }, select: { role: true } } },
  });
  if (!row) return null;
  if (row.ownerId === userId) return { role: "owner", ownerId: row.ownerId };
  const member = row.members[0];
  return member ? { role: member.role, ownerId: row.ownerId } : null;
}

export const canWrite = (role: EventRole | undefined): boolean =>
  role === "owner" || role === "editor";

/**
 * Links invites sent to the caller's verified email to their account, so
 * shared events show up on their dashboard. Run before listing.
 */
export async function claimInvites(prisma: PrismaClient, caller: Caller): Promise<void> {
  if (!caller.email) return;
  await prisma.eventMember.updateMany({
    where: { email: caller.email, userId: null },
    data: { userId: caller.userId },
  });
}

function httpError(statusCode: number, message: string): Error {
  return Object.assign(new Error(message), { statusCode });
}

export const notFound = () => httpError(404, "Event not found");
export const forbidden = (message = "You can view this event but not change it") =>
  httpError(403, message);
