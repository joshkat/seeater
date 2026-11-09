import type { FastifyInstance } from "fastify";

import { ImageService } from "./image.service.js";
import { sendImage } from "./sharing.routes.js";
import { tokenImageParams, tokenParams } from "./sharing.schema.js";
import { SharingService } from "./sharing.service.js";

/** Requests per minute per IP for public links: plenty to view, too few to guess. */
const PUBLIC_RATE_LIMIT = { max: 60, timeWindow: "1 minute" };

/**
 * Public, read-only endpoints behind a share link (`/s/:token` in the web
 * app). No sign-in: the unguessable token is the permission, and turning the
 * link off or regenerating it makes old links 404.
 */
export async function sharedRoutes(fastify: FastifyInstance): Promise<void> {
  const sharing = new SharingService(fastify.prisma);
  const images = new ImageService(fastify.prisma);

  fastify.get(
    "/shared/:token",
    { config: { rateLimit: PUBLIC_RATE_LIMIT } },
    async (request, reply) => {
      const { token } = tokenParams.parse(request.params);
      const event = await sharing.shared(token);
      // Guest names: don't let shared caches or the Referer keep them around.
      reply.header("cache-control", "no-store").header("referrer-policy", "no-referrer");
      return event;
    },
  );

  fastify.get(
    "/shared/:token/images/:imageId",
    { config: { rateLimit: PUBLIC_RATE_LIMIT } },
    async (request, reply) => {
      const { token, imageId } = tokenImageParams.parse(request.params);
      const eventId = await sharing.eventIdForToken(token);
      if (!eventId) throw fastify.httpErrors.notFound("Link not found");
      return sendImage(reply, await images.get(eventId, imageId)).header(
        "cache-control",
        "no-store",
      );
    },
  );
}
