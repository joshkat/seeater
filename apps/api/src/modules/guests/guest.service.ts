import type { Guest, PrismaClient } from "@prisma/client";

import type { BulkGuestsBody, CreateGuestBody, UpdateGuestBody } from "./guest.schema.js";

/** Outcome of a seat-assignment attempt. `affected` lists every guest whose
 * seat changed (the assigned guest, plus any displaced previous occupant). */
export type AssignResult =
  | { ok: true; affected: Guest[] }
  | { ok: false; reason: "event_not_found" | "guest_not_found" | "seat_not_found" };

export class GuestService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Returns the event (id + floorPlanId) if owned by `ownerId`, else null. */
  private ownedEvent(eventId: string, ownerId: string) {
    return this.prisma.event.findFirst({
      where: { id: eventId, ownerId },
      select: { id: true, floorPlanId: true },
    });
  }

  async create(eventId: string, ownerId: string, body: CreateGuestBody): Promise<Guest | null> {
    if (!(await this.ownedEvent(eventId, ownerId))) return null;
    return this.prisma.guest.create({
      data: {
        eventId,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
      },
    });
  }

  async bulkCreate(
    eventId: string,
    ownerId: string,
    body: BulkGuestsBody,
  ): Promise<Guest[] | null> {
    if (!(await this.ownedEvent(eventId, ownerId))) return null;
    // createMany doesn't return rows, so create within a transaction to return them.
    return this.prisma.$transaction(
      body.guests.map((g) =>
        this.prisma.guest.create({
          data: { eventId, name: g.name, email: g.email ?? null, phone: g.phone ?? null },
        }),
      ),
    );
  }

  async update(
    eventId: string,
    ownerId: string,
    guestId: string,
    body: UpdateGuestBody,
  ): Promise<Guest | null> {
    if (!(await this.ownedEvent(eventId, ownerId))) return null;
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest || guest.eventId !== eventId) return null;
    return this.prisma.guest.update({
      where: { id: guestId },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        rsvpStatus: body.rsvpStatus,
      },
    });
  }

  async remove(eventId: string, ownerId: string, guestId: string): Promise<boolean> {
    if (!(await this.ownedEvent(eventId, ownerId))) return false;
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      select: { eventId: true },
    });
    if (!guest || guest.eventId !== eventId) return false;
    await this.prisma.guest.delete({ where: { id: guestId } });
    return true;
  }

  /**
   * Assigns `guestId` to `seatId` (or clears it when null). Enforces that the
   * seat belongs to the event's floor plan and that a seat holds one guest:
   * dropping onto an occupied seat displaces the previous occupant.
   */
  async assignSeat(
    eventId: string,
    ownerId: string,
    guestId: string,
    seatId: string | null,
  ): Promise<AssignResult> {
    const event = await this.ownedEvent(eventId, ownerId);
    if (!event) return { ok: false, reason: "event_not_found" };

    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest || guest.eventId !== eventId) return { ok: false, reason: "guest_not_found" };

    if (seatId === null) {
      const cleared = await this.prisma.guest.update({
        where: { id: guestId },
        data: { seatId: null },
      });
      return { ok: true, affected: [cleared] };
    }

    // The seat must exist and belong to a table on this event's floor plan.
    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
      select: { table: { select: { floorPlanId: true } } },
    });
    if (!seat || seat.table.floorPlanId !== event.floorPlanId) {
      return { ok: false, reason: "seat_not_found" };
    }

    const occupant = await this.prisma.guest.findUnique({ where: { seatId } });

    const affected = await this.prisma.$transaction(async (tx) => {
      const changed: Guest[] = [];
      if (occupant && occupant.id !== guestId) {
        changed.push(await tx.guest.update({ where: { id: occupant.id }, data: { seatId: null } }));
      }
      changed.push(await tx.guest.update({ where: { id: guestId }, data: { seatId } }));
      return changed;
    });

    return { ok: true, affected };
  }
}
