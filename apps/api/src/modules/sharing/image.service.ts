import { MAX_IMAGES_PER_EVENT, type RemoteImageMeta } from "@seating/shared";

import type { PrismaClient } from "../../generated/prisma/client.js";
import type { Caller } from "../../lib/auth.js";
import { accessFor, canWrite, forbidden, notFound } from "../events/access.js";

export interface StoredImage extends RemoteImageMeta {
  bytes: Uint8Array;
}

/**
 * Floor-plan images. The document only references an image id; the bytes
 * live here so other devices and collaborators can show the backdrop. An id
 * always means the same picture, so uploads are write-once.
 */
export class ImageService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(caller: Caller, eventId: string): Promise<RemoteImageMeta[]> {
    if (!(await accessFor(this.prisma, caller.userId, eventId))) throw notFound();
    return this.prisma.eventImage.findMany({
      where: { eventId },
      select: { id: true, mimeType: true, width: true, height: true },
    });
  }

  async put(caller: Caller, eventId: string, image: StoredImage): Promise<void> {
    const access = await accessFor(this.prisma, caller.userId, eventId);
    if (!access) throw notFound();
    if (!canWrite(access.role)) throw forbidden();

    const existing = await this.prisma.eventImage.findUnique({
      where: { eventId_id: { eventId, id: image.id } },
      select: { id: true },
    });
    if (existing) return;
    const count = await this.prisma.eventImage.count({ where: { eventId } });
    if (count >= MAX_IMAGES_PER_EVENT) {
      throw Object.assign(new Error("Too many images for one event"), { statusCode: 400 });
    }
    await this.prisma.eventImage.upsert({
      where: { eventId_id: { eventId, id: image.id } },
      create: { eventId, ...image, bytes: Buffer.from(image.bytes) },
      update: {},
    });
  }

  /** Bytes for an event the caller can see (or that a valid link exposes). */
  async get(eventId: string, imageId: string): Promise<StoredImage | null> {
    const row = await this.prisma.eventImage.findUnique({
      where: { eventId_id: { eventId, id: imageId } },
    });
    return row
      ? {
          id: row.id,
          mimeType: row.mimeType,
          width: row.width,
          height: row.height,
          bytes: row.bytes,
        }
      : null;
  }

  async getFor(caller: Caller, eventId: string, imageId: string): Promise<StoredImage | null> {
    if (!(await accessFor(this.prisma, caller.userId, eventId))) throw notFound();
    return this.get(eventId, imageId);
  }
}
