import { z } from "zod";

/** Path param for routes scoped to a floor plan's event. */
export const floorPlanEventParamsSchema = z.object({
  floorPlanId: z.string().cuid(),
});

export type FloorPlanEventParams = z.infer<typeof floorPlanEventParamsSchema>;
