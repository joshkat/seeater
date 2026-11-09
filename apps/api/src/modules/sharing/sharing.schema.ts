import { MAX_SYNCED_IMAGE_BYTES, emailSchema, imageMimeTypeSchema } from "@seating/shared";
import { z } from "zod";

export const eventIdParams = z.object({ id: z.string().min(1).max(64) });

export const memberParams = eventIdParams.extend({ email: emailSchema });

export const tokenParams = z.object({ token: z.string().min(20).max(100) });

const imageId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[\w-]+$/);

export const imageParams = eventIdParams.extend({ imageId });

export const tokenImageParams = tokenParams.extend({ imageId });

export const releaseLockQuery = z.object({ clientId: z.string().min(8).max(100) });

const dimension = z.coerce.number().int().positive().max(20_000);

/** Headers that come with an image upload (the body is the raw bytes). */
export const imageUploadHeaders = z.object({
  "content-type": imageMimeTypeSchema,
  "x-image-width": dimension,
  "x-image-height": dimension,
});

export { MAX_SYNCED_IMAGE_BYTES };
