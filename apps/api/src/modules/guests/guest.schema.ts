import { z } from "zod";

/** A single guest's editable details. Email is kept lenient (not strictly
 * validated) so messy CSV imports don't fail wholesale. */
const guestFields = {
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().max(200).nullish(),
  phone: z.string().trim().max(40).nullish(),
};

export const createGuestSchema = z.object(guestFields);

export const bulkGuestsSchema = z.object({
  guests: z.array(z.object(guestFields)).min(1).max(1000),
});

export const updateGuestSchema = z
  .object({
    ...guestFields,
    rsvpStatus: z.enum(["pending", "accepted", "declined"]),
  })
  .partial();

export const assignSeatSchema = z.object({
  seatId: z.string().cuid().nullable(),
});

export const eventIdParamsSchema = z.object({
  eventId: z.string().cuid(),
});

export const guestItemParamsSchema = z.object({
  eventId: z.string().cuid(),
  guestId: z.string().cuid(),
});

export type CreateGuestBody = z.infer<typeof createGuestSchema>;
export type BulkGuestsBody = z.infer<typeof bulkGuestsSchema>;
export type UpdateGuestBody = z.infer<typeof updateGuestSchema>;
export type AssignSeatBody = z.infer<typeof assignSeatSchema>;
