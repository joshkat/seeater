import type { EventWithGuests, Guest, GuestInput, GuestUpdateInput } from "@seating/shared";

import { apiRequest } from "../../../lib/apiClient";

/** API surface for a floor plan's event and its guest list. */

/** Returns (creating on first access) the default event + guests for a plan. */
export function getEventForFloorPlan(floorPlanId: string): Promise<EventWithGuests> {
  return apiRequest<EventWithGuests>(`/floor-plans/${floorPlanId}/event`);
}

export function createGuest(eventId: string, input: GuestInput): Promise<Guest> {
  return apiRequest<Guest>(`/events/${eventId}/guests`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function bulkCreateGuests(eventId: string, guests: GuestInput[]): Promise<Guest[]> {
  return apiRequest<Guest[]>(`/events/${eventId}/guests/bulk`, {
    method: "POST",
    body: JSON.stringify({ guests }),
  });
}

export function updateGuest(
  eventId: string,
  guestId: string,
  patch: GuestUpdateInput,
): Promise<Guest> {
  return apiRequest<Guest>(`/events/${eventId}/guests/${guestId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteGuest(eventId: string, guestId: string): Promise<void> {
  return apiRequest<void>(`/events/${eventId}/guests/${guestId}`, {
    method: "DELETE",
  });
}

/** Assigns the guest to a seat (or clears it with null). Returns every guest
 * whose seat changed — the assigned guest plus any displaced occupant. */
export function assignGuestSeat(
  eventId: string,
  guestId: string,
  seatId: string | null,
): Promise<Guest[]> {
  return apiRequest<Guest[]>(`/events/${eventId}/guests/${guestId}/seat`, {
    method: "PUT",
    body: JSON.stringify({ seatId }),
  });
}
