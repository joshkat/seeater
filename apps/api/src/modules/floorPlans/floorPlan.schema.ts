import { z } from "zod";

import { sizeSchema } from "../../lib/validation.js";

export const createFloorPlanSchema = z.object({
  name: z.string().min(1).max(120),
  dimensions: sizeSchema.optional(),
  venueId: z.string().cuid().nullish(),
  isTemplate: z.boolean().optional(),
});

export const updateFloorPlanSchema = z
  .object({
    name: z.string().min(1).max(120),
    dimensions: sizeSchema,
    venueId: z.string().cuid().nullable(),
    isTemplate: z.boolean(),
  })
  .partial();

export const floorPlanIdParamsSchema = z.object({
  id: z.string().cuid(),
});

export const duplicateFloorPlanSchema = z.object({
  copyGuests: z.boolean().optional(),
  copyAssignments: z.boolean().optional(),
});

export type CreateFloorPlanBody = z.infer<typeof createFloorPlanSchema>;
export type UpdateFloorPlanBody = z.infer<typeof updateFloorPlanSchema>;
export type DuplicateFloorPlanBody = z.infer<typeof duplicateFloorPlanSchema>;
