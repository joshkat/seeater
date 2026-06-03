import type { PrismaClient } from "@prisma/client";

/** Default name for the implicit event created per floor plan. */
const DEFAULT_EVENT_NAME = "Guest list";

/** Prisma include yielding an event with its full guest list. */
export const eventInclude = {
  guests: { orderBy: { name: "asc" } },
} as const;

export class EventService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Confirms the floor plan exists and is owned by `ownerId`. */
  private async ownsPlan(floorPlanId: string, ownerId: string): Promise<boolean> {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      select: { ownerId: true },
    });
    return plan?.ownerId === ownerId;
  }

  /**
   * Returns the floor plan's event (with guests), creating a default one on
   * first access. Returns null if the plan is missing or not owned.
   */
  async getOrCreateForFloorPlan(floorPlanId: string, ownerId: string) {
    if (!(await this.ownsPlan(floorPlanId, ownerId))) return null;

    const existing = await this.prisma.event.findFirst({
      where: { floorPlanId, ownerId },
      orderBy: { createdAt: "asc" },
      include: eventInclude,
    });
    if (existing) return existing;

    return this.prisma.event.create({
      data: { floorPlanId, ownerId, name: DEFAULT_EVENT_NAME },
      include: eventInclude,
    });
  }
}
