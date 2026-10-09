import { z } from "zod";

/** Path param: a document id (client-generated UUID, or a legacy id). */
export const eventIdParamsSchema = z.object({
  id: z.string().min(1).max(64),
});

/** `DELETE /events/:id?baseVersion=N` */
export const deleteEventQuerySchema = z.object({
  baseVersion: z.coerce.number().int().positive(),
});

/** Largest accepted PUT body. A 5,000-guest wedding is ~1.5 MB of JSON. */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
