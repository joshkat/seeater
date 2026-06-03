import type { FastifyInstance } from "fastify";

import { getOwnerId } from "../../lib/auth.js";
import { toGuestDTO } from "../../lib/mappers.js";
import {
  assignSeatSchema,
  bulkGuestsSchema,
  createGuestSchema,
  eventIdParamsSchema,
  guestItemParamsSchema,
  updateGuestSchema,
} from "./guest.schema.js";
import { GuestService } from "./guest.service.js";

export async function guestRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new GuestService(fastify.prisma);

  fastify.post("/events/:eventId/guests", async (request, reply) => {
    const ownerId = getOwnerId(request);
    const { eventId } = eventIdParamsSchema.parse(request.params);
    const body = createGuestSchema.parse(request.body);
    const guest = await service.create(eventId, ownerId, body);
    if (!guest) throw fastify.httpErrors.notFound("Event not found");
    return reply.code(201).send(toGuestDTO(guest));
  });

  fastify.post("/events/:eventId/guests/bulk", async (request, reply) => {
    const ownerId = getOwnerId(request);
    const { eventId } = eventIdParamsSchema.parse(request.params);
    const body = bulkGuestsSchema.parse(request.body);
    const guests = await service.bulkCreate(eventId, ownerId, body);
    if (!guests) throw fastify.httpErrors.notFound("Event not found");
    return reply.code(201).send(guests.map(toGuestDTO));
  });

  fastify.patch("/events/:eventId/guests/:guestId", async (request) => {
    const ownerId = getOwnerId(request);
    const { eventId, guestId } = guestItemParamsSchema.parse(request.params);
    const body = updateGuestSchema.parse(request.body);
    const guest = await service.update(eventId, ownerId, guestId, body);
    if (!guest) throw fastify.httpErrors.notFound("Guest not found");
    return toGuestDTO(guest);
  });

  fastify.delete("/events/:eventId/guests/:guestId", async (request, reply) => {
    const ownerId = getOwnerId(request);
    const { eventId, guestId } = guestItemParamsSchema.parse(request.params);
    const removed = await service.remove(eventId, ownerId, guestId);
    if (!removed) throw fastify.httpErrors.notFound("Guest not found");
    return reply.code(204).send();
  });

  // Assign the guest to a seat (or clear it with seatId: null). Returns every
  // guest whose seat changed, so the client can reconcile displacements.
  fastify.put("/events/:eventId/guests/:guestId/seat", async (request) => {
    const ownerId = getOwnerId(request);
    const { eventId, guestId } = guestItemParamsSchema.parse(request.params);
    const { seatId } = assignSeatSchema.parse(request.body);
    const result = await service.assignSeat(eventId, ownerId, guestId, seatId);
    if (!result.ok) {
      if (result.reason === "seat_not_found") {
        throw fastify.httpErrors.notFound("Seat not found on this floor plan");
      }
      throw fastify.httpErrors.notFound(
        result.reason === "guest_not_found" ? "Guest not found" : "Event not found",
      );
    }
    return result.affected.map(toGuestDTO);
  });
}
