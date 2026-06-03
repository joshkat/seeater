import type { PrismaClient } from "@prisma/client";
import { DEFAULT_FLOOR_PLAN_SIZE } from "@seating/shared";

import type {
  CreateFloorPlanBody,
  DuplicateFloorPlanBody,
  UpdateFloorPlanBody,
} from "./floorPlan.schema.js";

/** Prisma include that yields a fully-populated floor plan (tables + seats). */
export const floorPlanInclude = {
  tables: {
    orderBy: { createdAt: "asc" },
    include: { seats: { orderBy: { index: "asc" } } },
  },
} as const;

export class FloorPlanService {
  constructor(private readonly prisma: PrismaClient) {}

  listForOwner(ownerId: string) {
    return this.prisma.floorPlan.findMany({
      where: { ownerId },
      include: floorPlanInclude,
      orderBy: { updatedAt: "desc" },
    });
  }

  /** Lightweight list for the events dashboard: metadata + table/guest counts. */
  listSummariesForOwner(ownerId: string) {
    return this.prisma.floorPlan.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        width: true,
        height: true,
        isTemplate: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { tables: true } },
        events: { select: { _count: { select: { guests: true } } } },
      },
    });
  }

  /** Returns the plan if it exists and is readable by `ownerId` (owner or template). */
  async getReadable(id: string, ownerId: string) {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id },
      include: floorPlanInclude,
    });
    if (!plan) return null;
    if (plan.ownerId !== ownerId && !plan.isTemplate) return null;
    return plan;
  }

  create(ownerId: string, body: CreateFloorPlanBody) {
    const dimensions = body.dimensions ?? DEFAULT_FLOOR_PLAN_SIZE;
    return this.prisma.floorPlan.create({
      data: {
        ownerId,
        name: body.name,
        width: dimensions.width,
        height: dimensions.height,
        venueId: body.venueId ?? null,
        isTemplate: body.isTemplate ?? false,
      },
      include: floorPlanInclude,
    });
  }

  /** Verifies ownership; returns false if the plan is missing or not owned. */
  private async ownsPlan(id: string, ownerId: string): Promise<boolean> {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    return plan?.ownerId === ownerId;
  }

  async update(id: string, ownerId: string, body: UpdateFloorPlanBody) {
    if (!(await this.ownsPlan(id, ownerId))) return null;
    return this.prisma.floorPlan.update({
      where: { id },
      data: {
        name: body.name,
        width: body.dimensions?.width,
        height: body.dimensions?.height,
        venueId: body.venueId,
        isTemplate: body.isTemplate,
      },
      include: floorPlanInclude,
    });
  }

  async remove(id: string, ownerId: string): Promise<boolean> {
    if (!(await this.ownsPlan(id, ownerId))) return false;
    await this.prisma.floorPlan.delete({ where: { id } });
    return true;
  }

  /**
   * Clones a plan into a new event. Always copies the table/seat layout (with
   * fresh ids). Optionally copies the guest list, and optionally keeps each
   * guest in the same seat (remapped to the cloned seat ids).
   */
  async duplicate(id: string, ownerId: string, opts: DuplicateFloorPlanBody) {
    const source = await this.prisma.floorPlan.findFirst({
      where: { id, ownerId },
      include: {
        tables: {
          orderBy: { createdAt: "asc" },
          include: { seats: { orderBy: { index: "asc" } } },
        },
      },
    });
    if (!source) return null;

    return this.prisma.$transaction(async (tx) => {
      const newPlan = await tx.floorPlan.create({
        data: {
          ownerId,
          name: `${source.name} (copy)`,
          width: source.width,
          height: source.height,
          venueId: source.venueId,
          isTemplate: false,
        },
      });

      // old seat id -> new seat id, so we can remap guest assignments.
      const seatIdMap = new Map<string, string>();

      for (const table of source.tables) {
        const cloned = await tx.table.create({
          data: {
            floorPlanId: newPlan.id,
            label: table.label,
            shape: table.shape,
            x: table.x,
            y: table.y,
            rotation: table.rotation,
            width: table.width,
            height: table.height,
            chairLayoutMode: table.chairLayoutMode,
            seats: {
              create: table.seats.map((seat) => ({
                index: seat.index,
                label: seat.label,
                offsetX: seat.offsetX,
                offsetY: seat.offsetY,
              })),
            },
          },
          include: { seats: true },
        });
        for (const oldSeat of table.seats) {
          const newSeat = cloned.seats.find((s) => s.index === oldSeat.index);
          if (newSeat) seatIdMap.set(oldSeat.id, newSeat.id);
        }
      }

      if (opts.copyGuests) {
        const sourceEvent = await tx.event.findFirst({
          where: { floorPlanId: source.id, ownerId },
          orderBy: { createdAt: "asc" },
          include: { guests: true },
        });
        if (sourceEvent && sourceEvent.guests.length > 0) {
          const newEvent = await tx.event.create({
            data: { floorPlanId: newPlan.id, ownerId, name: sourceEvent.name },
          });
          for (const guest of sourceEvent.guests) {
            const seatId =
              opts.copyAssignments && guest.seatId ? (seatIdMap.get(guest.seatId) ?? null) : null;
            await tx.guest.create({
              data: {
                eventId: newEvent.id,
                name: guest.name,
                email: guest.email,
                phone: guest.phone,
                rsvpStatus: guest.rsvpStatus,
                seatId,
              },
            });
          }
        }
      }

      return tx.floorPlan.findUnique({ where: { id: newPlan.id }, include: floorPlanInclude });
    });
  }
}
