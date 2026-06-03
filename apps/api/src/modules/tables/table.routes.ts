import type { FastifyInstance } from "fastify";

import { getOwnerId } from "../../lib/auth.js";
import { toTableDTO } from "../../lib/mappers.js";
import {
  createTableSchema,
  tableItemParamsSchema,
  tableParamsSchema,
  updateTableSchema,
} from "./table.schema.js";
import { TableService } from "./table.service.js";

export async function tableRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new TableService(fastify.prisma);

  fastify.post("/floor-plans/:floorPlanId/tables", async (request, reply) => {
    const ownerId = getOwnerId(request);
    const { floorPlanId } = tableParamsSchema.parse(request.params);
    const body = createTableSchema.parse(request.body);
    const table = await service.create(floorPlanId, ownerId, body);
    if (!table) throw fastify.httpErrors.notFound("Floor plan not found");
    return reply.code(201).send(toTableDTO(table));
  });

  fastify.patch("/floor-plans/:floorPlanId/tables/:tableId", async (request) => {
    const ownerId = getOwnerId(request);
    const { floorPlanId, tableId } = tableItemParamsSchema.parse(request.params);
    const body = updateTableSchema.parse(request.body);
    const table = await service.update(floorPlanId, tableId, ownerId, body);
    if (!table) throw fastify.httpErrors.notFound("Table not found");
    return toTableDTO(table);
  });

  fastify.delete("/floor-plans/:floorPlanId/tables/:tableId", async (request, reply) => {
    const ownerId = getOwnerId(request);
    const { floorPlanId, tableId } = tableItemParamsSchema.parse(request.params);
    const removed = await service.remove(floorPlanId, tableId, ownerId);
    if (!removed) throw fastify.httpErrors.notFound("Table not found");
    return reply.code(204).send();
  });
}
