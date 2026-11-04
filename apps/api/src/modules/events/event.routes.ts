import {
  type ListEventsResponse,
  type PutEventResponse,
  type VersionConflictResponse,
  putEventRequestSchema,
} from "@seating/shared";
import type { FastifyInstance, FastifyReply } from "fastify";

import { getCaller } from "../../lib/auth.js";
import { MAX_DOCUMENT_BYTES, deleteEventQuerySchema, eventIdParamsSchema } from "./event.schema.js";
import { EventDocumentService, type WriteResult } from "./event.service.js";

function sendConflict(
  reply: FastifyReply,
  result: Extract<WriteResult, { ok: false }>,
): FastifyReply {
  const body: VersionConflictResponse = {
    statusCode: 409,
    error: "Conflict",
    message: "The document changed on the server since your last sync",
    current: result.current,
    ...(result.reason ? { reason: result.reason } : {}),
  };
  return reply.code(409).send(body);
}

/**
 * Sync endpoints for event documents: the caller's own and those shared with
 * them. The web app talks to these only when a user is signed in; signed-out
 * use never touches the server (except a public read-only link).
 */
export async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new EventDocumentService(fastify.prisma);

  // Everything this owner has, including tombstones, newest first.
  fastify.get("/events", async (request): Promise<ListEventsResponse> => {
    return { events: await service.list(await getCaller(request)) };
  });

  fastify.get("/events/:id", async (request) => {
    const { id } = eventIdParamsSchema.parse(request.params);
    return service.get(await getCaller(request), id);
  });

  // Create (baseVersion: null) or replace a whole document, compare-and-swap.
  fastify.put("/events/:id", { bodyLimit: MAX_DOCUMENT_BYTES }, async (request, reply) => {
    const caller = await getCaller(request);
    const { id } = eventIdParamsSchema.parse(request.params);
    const { baseVersion, data } = putEventRequestSchema.parse(request.body);
    if (data.id !== id) throw fastify.httpErrors.badRequest("Body id does not match URL id");

    const result = await service.put(caller, baseVersion, data);
    if (!result.ok) return sendConflict(reply, result);
    const body: PutEventResponse = { id, version: result.version };
    return body;
  });

  fastify.delete("/events/:id", async (request, reply) => {
    const caller = await getCaller(request);
    const { id } = eventIdParamsSchema.parse(request.params);
    const { baseVersion } = deleteEventQuerySchema.parse(request.query);
    const result = await service.remove(caller, id, baseVersion);
    if (!result.ok) return sendConflict(reply, result);
    return reply.code(204).send();
  });
}
