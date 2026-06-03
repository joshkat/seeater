import type { FastifyInstance } from "fastify";

import { getOwnerId } from "../../lib/auth.js";
import { toEventWithGuestsDTO } from "../../lib/mappers.js";
import { floorPlanEventParamsSchema } from "./event.schema.js";
import { EventService } from "./event.service.js";

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new EventService(fastify.prisma);

  // Returns (creating on first access) the default event + guests for a plan.
  fastify.get("/floor-plans/:floorPlanId/event", async (request) => {
    const ownerId = getOwnerId(request);
    const { floorPlanId } = floorPlanEventParamsSchema.parse(request.params);
    const event = await service.getOrCreateForFloorPlan(floorPlanId, ownerId);
    if (!event) throw fastify.httpErrors.notFound("Floor plan not found");
    return toEventWithGuestsDTO(event);
  });
}
