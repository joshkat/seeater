import type { EventDoc } from "./schema.js";

/** What the events dashboard shows for one event — cheap to store and list. */
export interface EventSummary {
  id: string;
  name: string;
  tableCount: number;
  guestCount: number;
  seatedCount: number;
  createdAt: string;
  updatedAt: string;
}

export function summarizeEventDoc(doc: EventDoc): EventSummary {
  return {
    id: doc.id,
    name: doc.name,
    tableCount: doc.tables.length,
    guestCount: doc.guests.length,
    seatedCount: doc.guests.filter((guest) => guest.seatId !== null).length,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
