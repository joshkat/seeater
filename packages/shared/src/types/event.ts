/**
 * Events, guests, and seat assignments.
 *
 * An Event uses a FloorPlan (typically a clone of a template or a custom plan)
 * and has a guest list. Each guest may be assigned to exactly one seat; a seat
 * holds at most one guest.
 */

export type RsvpStatus = "pending" | "accepted" | "declined";

export interface Event {
  id: string;
  ownerId: string;
  floorPlanId: string;
  name: string;
  /** ISO date-time string; null until scheduled. */
  startsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  email: string | null;
  phone: string | null;
  rsvpStatus: RsvpStatus;
  /** Seat this guest is assigned to, if any. */
  seatId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  floorPlanId: string;
  name: string;
  startsAt?: string | null;
}

export interface GuestInput {
  name: string;
  email?: string | null;
  phone?: string | null;
}

/** Editable guest fields, including RSVP status. All optional (partial update). */
export interface GuestUpdateInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  rsvpStatus?: RsvpStatus;
}

/** Payload for importing many guests at once (e.g. from a CSV). */
export interface GuestBulkInput {
  guests: GuestInput[];
}

/** An event together with its guest list — the shape the editor loads. */
export interface EventWithGuests extends Event {
  guests: Guest[];
}

/** Payload for assigning (or clearing) a guest's seat. */
export interface SeatAssignmentInput {
  /** Target seat, or null to unassign. */
  seatId: string | null;
}
