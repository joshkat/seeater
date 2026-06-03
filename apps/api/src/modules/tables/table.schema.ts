import { z } from "zod";

import { pointSchema, sizeSchema } from "../../lib/validation.js";

const tableShapeSchema = z.enum(["round", "rectangle"]);
const chairLayoutModeSchema = z.enum(["auto", "custom"]);

const seatInputSchema = z.object({
  index: z.number().int().min(0),
  label: z.string().max(40).nullish(),
  offset: pointSchema.nullish(),
});

export const createTableSchema = z.object({
  label: z.string().max(80).optional(),
  shape: tableShapeSchema,
  position: pointSchema,
  rotation: z.number().finite().optional(),
  size: sizeSchema,
  chairLayoutMode: chairLayoutModeSchema.optional(),
  seatCount: z.number().int().min(0).max(64).optional(),
  seats: z.array(seatInputSchema).optional(),
});

export const updateTableSchema = z
  .object({
    label: z.string().max(80),
    shape: tableShapeSchema,
    position: pointSchema,
    rotation: z.number().finite(),
    size: sizeSchema,
    chairLayoutMode: chairLayoutModeSchema,
    seatCount: z.number().int().min(0).max(64),
    seats: z.array(seatInputSchema),
  })
  .partial();

export const tableParamsSchema = z.object({
  floorPlanId: z.string().cuid(),
});

export const tableItemParamsSchema = z.object({
  floorPlanId: z.string().cuid(),
  tableId: z.string().cuid(),
});

export type CreateTableBody = z.infer<typeof createTableSchema>;
export type UpdateTableBody = z.infer<typeof updateTableSchema>;
