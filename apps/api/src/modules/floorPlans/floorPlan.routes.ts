import type { FastifyInstance } from "fastify";

import { getOwnerId } from "../../lib/auth.js";
import { toFloorPlanDTO, toFloorPlanSummaryDTO } from "../../lib/mappers.js";
import {
  createFloorPlanSchema,
  duplicateFloorPlanSchema,
  floorPlanIdParamsSchema,
  updateFloorPlanSchema,
} from "./floorPlan.schema.js";
import { FloorPlanService } from "./floorPlan.service.js";

export async function floorPlanRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new FloorPlanService(fastify.prisma);

  fastify.get("/floor-plans", async (request) => {
    const ownerId = getOwnerId(request);
    const plans = await service.listForOwner(ownerId);
    return plans.map(toFloorPlanDTO);
  });

  // Lightweight list for the events dashboard. Registered before "/:id" so the
  // literal "summaries" segment isn't captured as an id param.
  fastify.get("/floor-plans/summaries", async (request) => {
    const ownerId = getOwnerId(request);
    const summaries = await service.listSummariesForOwner(ownerId);
    return summaries.map(toFloorPlanSummaryDTO);
  });

  fastify.post("/floor-plans", async (request, reply) => {
    const ownerId = getOwnerId(request);
    const body = createFloorPlanSchema.parse(request.body);
    const plan = await service.create(ownerId, body);
    return reply.code(201).send(toFloorPlanDTO(plan));
  });

  fastify.get("/floor-plans/:id", async (request) => {
    const ownerId = getOwnerId(request);
    const { id } = floorPlanIdParamsSchema.parse(request.params);
    const plan = await service.getReadable(id, ownerId);
    if (!plan) throw fastify.httpErrors.notFound("Floor plan not found");
    return toFloorPlanDTO(plan);
  });

  fastify.patch("/floor-plans/:id", async (request) => {
    const ownerId = getOwnerId(request);
    const { id } = floorPlanIdParamsSchema.parse(request.params);
    const body = updateFloorPlanSchema.parse(request.body);
    const plan = await service.update(id, ownerId, body);
    if (!plan) throw fastify.httpErrors.notFound("Floor plan not found");
    return toFloorPlanDTO(plan);
  });

  fastify.delete("/floor-plans/:id", async (request, reply) => {
    const ownerId = getOwnerId(request);
    const { id } = floorPlanIdParamsSchema.parse(request.params);
    const removed = await service.remove(id, ownerId);
    if (!removed) throw fastify.httpErrors.notFound("Floor plan not found");
    return reply.code(204).send();
  });

  fastify.post("/floor-plans/:id/duplicate", async (request, reply) => {
    const ownerId = getOwnerId(request);
    const { id } = floorPlanIdParamsSchema.parse(request.params);
    const opts = duplicateFloorPlanSchema.parse(request.body ?? {});
    const plan = await service.duplicate(id, ownerId, opts);
    if (!plan) throw fastify.httpErrors.notFound("Floor plan not found");
    return reply.code(201).send(toFloorPlanDTO(plan));
  });
}
