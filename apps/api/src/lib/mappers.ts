import type { Event, FloorPlan, Guest, Seat, Table } from "@prisma/client";
import type {
  Event as EventDTO,
  EventWithGuests as EventWithGuestsDTO,
  FloorPlan as FloorPlanDTO,
  FloorPlanSummary as FloorPlanSummaryDTO,
  Guest as GuestDTO,
  Seat as SeatDTO,
  Table as TableDTO,
} from "@seating/shared";

/**
 * Maps Prisma rows (flat columns, Date timestamps) to the shared DTO shapes
 * (nested position/size objects, ISO strings) the web client consumes.
 */

type TableWithSeats = Table & { seats: Seat[] };
type FloorPlanWithTables = FloorPlan & { tables: TableWithSeats[] };

export function toSeatDTO(seat: Seat): SeatDTO {
  const hasOffset = seat.offsetX !== null && seat.offsetY !== null;
  return {
    id: seat.id,
    tableId: seat.tableId,
    index: seat.index,
    label: seat.label,
    offset: hasOffset ? { x: seat.offsetX as number, y: seat.offsetY as number } : null,
  };
}

export function toTableDTO(table: TableWithSeats): TableDTO {
  return {
    id: table.id,
    floorPlanId: table.floorPlanId,
    label: table.label,
    shape: table.shape,
    position: { x: table.x, y: table.y },
    rotation: table.rotation,
    size: { width: table.width, height: table.height },
    chairLayoutMode: table.chairLayoutMode,
    seats: [...table.seats].sort((a, b) => a.index - b.index).map(toSeatDTO),
  };
}

export function toFloorPlanDTO(plan: FloorPlanWithTables): FloorPlanDTO {
  return {
    id: plan.id,
    venueId: plan.venueId,
    ownerId: plan.ownerId,
    name: plan.name,
    dimensions: { width: plan.width, height: plan.height },
    isTemplate: plan.isTemplate,
    tables: plan.tables.map(toTableDTO),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

/** Selected floor-plan row with table/guest counts, for the dashboard list. */
type FloorPlanWithCounts = {
  id: string;
  name: string;
  width: number;
  height: number;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { tables: number };
  events: { _count: { guests: number } }[];
};

export function toFloorPlanSummaryDTO(plan: FloorPlanWithCounts): FloorPlanSummaryDTO {
  const guestCount = plan.events.reduce((sum, event) => sum + event._count.guests, 0);
  return {
    id: plan.id,
    name: plan.name,
    dimensions: { width: plan.width, height: plan.height },
    isTemplate: plan.isTemplate,
    tableCount: plan._count.tables,
    guestCount,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

type EventWithGuests = Event & { guests: Guest[] };

export function toGuestDTO(guest: Guest): GuestDTO {
  return {
    id: guest.id,
    eventId: guest.eventId,
    name: guest.name,
    email: guest.email,
    phone: guest.phone,
    rsvpStatus: guest.rsvpStatus,
    seatId: guest.seatId,
    createdAt: guest.createdAt.toISOString(),
    updatedAt: guest.updatedAt.toISOString(),
  };
}

export function toEventDTO(event: Event): EventDTO {
  return {
    id: event.id,
    ownerId: event.ownerId,
    floorPlanId: event.floorPlanId,
    name: event.name,
    startsAt: event.startsAt ? event.startsAt.toISOString() : null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function toEventWithGuestsDTO(event: EventWithGuests): EventWithGuestsDTO {
  return {
    ...toEventDTO(event),
    guests: [...event.guests].sort((a, b) => a.name.localeCompare(b.name)).map(toGuestDTO),
  };
}
