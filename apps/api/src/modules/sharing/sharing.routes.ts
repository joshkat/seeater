import {
  type ListImagesResponse,
  inviteMemberRequestSchema,
  lockRequestSchema,
  shareLinkRequestSchema,
  updateMemberRequestSchema,
} from "@seating/shared";
import type { FastifyInstance, FastifyReply } from "fastify";

import { getCaller } from "../../lib/auth.js";
import { ImageService, type StoredImage } from "./image.service.js";
import { LockService } from "./lock.service.js";
import {
  MAX_SYNCED_IMAGE_BYTES,
  eventIdParams,
  imageParams,
  imageUploadHeaders,
  memberParams,
  releaseLockQuery,
} from "./sharing.schema.js";
import { SharingService } from "./sharing.service.js";

/** Sends image bytes. Images never change under one id, so they cache well. */
export function sendImage(reply: FastifyReply, image: StoredImage | null): FastifyReply {
  if (!image) return reply.code(404).send({ statusCode: 404, error: "Not Found" });
  return reply
    .header("content-type", image.mimeType)
    .header("cache-control", "private, max-age=31536000, immutable")
    .header("x-image-width", String(image.width))
    .header("x-image-height", String(image.height))
    .send(Buffer.from(image.bytes));
}

/**
 * Signed-in sharing endpoints under `/api/events/:id/…`: members, the public
 * link's on/off switch, the edit lock and floor-plan images.
 */
export async function sharingRoutes(fastify: FastifyInstance): Promise<void> {
  const sharing = new SharingService(fastify.prisma);
  const locks = new LockService(fastify.prisma);
  const images = new ImageService(fastify.prisma);

  // Image uploads are raw bytes (scoped to this plugin).
  fastify.addContentTypeParser(
    /^image\//,
    { parseAs: "buffer", bodyLimit: MAX_SYNCED_IMAGE_BYTES },
    (_request, body, done) => done(null, body),
  );

  fastify.get("/events/:id/members", async (request) => {
    const { id } = eventIdParams.parse(request.params);
    return sharing.get(await getCaller(request), id);
  });

  fastify.post("/events/:id/members", async (request) => {
    const { id } = eventIdParams.parse(request.params);
    const { email, role } = inviteMemberRequestSchema.parse(request.body);
    const caller = await getCaller(request);
    await sharing.invite(caller, id, email, role);
    return sharing.get(caller, id);
  });

  fastify.patch("/events/:id/members/:email", async (request) => {
    const { id, email } = memberParams.parse(request.params);
    const { role } = updateMemberRequestSchema.parse(request.body);
    const caller = await getCaller(request);
    await sharing.updateRole(caller, id, email, role);
    return sharing.get(caller, id);
  });

  fastify.delete("/events/:id/members/:email", async (request) => {
    const { id, email } = memberParams.parse(request.params);
    const caller = await getCaller(request);
    await sharing.removeMember(caller, id, email);
    return sharing.get(caller, id);
  });

  fastify.delete("/events/:id/membership", async (request, reply) => {
    const { id } = eventIdParams.parse(request.params);
    await sharing.leave(await getCaller(request), id);
    return reply.code(204).send();
  });

  fastify.post("/events/:id/share-link", async (request) => {
    const { id } = eventIdParams.parse(request.params);
    const { enabled, regenerate } = shareLinkRequestSchema.parse(request.body);
    return sharing.setLink(await getCaller(request), id, enabled, regenerate);
  });

  fastify.get("/events/:id/lock", async (request) => {
    const { id } = eventIdParams.parse(request.params);
    return locks.status(await getCaller(request), id);
  });

  fastify.put("/events/:id/lock", async (request) => {
    const { id } = eventIdParams.parse(request.params);
    const { clientId, force } = lockRequestSchema.parse(request.body);
    return locks.acquire(await getCaller(request), id, clientId, force);
  });

  fastify.delete("/events/:id/lock", async (request, reply) => {
    const { id } = eventIdParams.parse(request.params);
    const { clientId } = releaseLockQuery.parse(request.query);
    await locks.release(await getCaller(request), id, clientId);
    return reply.code(204).send();
  });

  fastify.get("/events/:id/images", async (request): Promise<ListImagesResponse> => {
    const { id } = eventIdParams.parse(request.params);
    return { images: await images.list(await getCaller(request), id) };
  });

  fastify.put("/events/:id/images/:imageId", async (request, reply) => {
    const { id, imageId } = imageParams.parse(request.params);
    const headers = imageUploadHeaders.parse(request.headers);
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      throw fastify.httpErrors.badRequest("Expected the image bytes as the body");
    }
    await images.put(await getCaller(request), id, {
      id: imageId,
      mimeType: headers["content-type"],
      width: headers["x-image-width"],
      height: headers["x-image-height"],
      bytes: request.body,
    });
    return reply.code(204).send();
  });

  fastify.get("/events/:id/images/:imageId", async (request, reply) => {
    const { id, imageId } = imageParams.parse(request.params);
    return sendImage(reply, await images.getFor(await getCaller(request), id, imageId));
  });
}
