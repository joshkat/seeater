import type { Size } from "./geometry.js";
import type { Table } from "./table.js";

/**
 * A venue is a physical location. Venues flagged via a public template
 * (see `isTemplate` on FloorPlan) power the "popular venues" gallery.
 */
export interface Venue {
  id: string;
  name: string;
  /** Optional address / location description. */
  address: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A floor plan is the canvas the editor works on: a sized area containing
 * tables. A plan flagged `isTemplate` can be cloned by other users.
 */
export interface FloorPlan {
  id: string;
  venueId: string | null;
  ownerId: string;
  name: string;
  /** Overall dimensions of the editable area, in floor-plan units. */
  dimensions: Size;
  isTemplate: boolean;
  tables: Table[];
  createdAt: string;
  updatedAt: string;
}

export interface FloorPlanInput {
  venueId?: string | null;
  name: string;
  /** Defaults to a standard floor-plan size on the server when omitted. */
  dimensions?: Size;
  isTemplate?: boolean;
}

/** Partial update of a floor plan's metadata (e.g. rename). */
export interface FloorPlanUpdateInput {
  name?: string;
  dimensions?: Size;
  isTemplate?: boolean;
}

/**
 * Lightweight floor-plan listing for the events dashboard — no tables/seats,
 * just metadata plus counts, so the list stays cheap to fetch.
 */
export interface FloorPlanSummary {
  id: string;
  name: string;
  dimensions: Size;
  isTemplate: boolean;
  tableCount: number;
  guestCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Options controlling what a duplicate carries over from the source plan. */
export interface DuplicateFloorPlanOptions {
  /** Copy the guest list (names, contacts, RSVP) into the new event. */
  copyGuests?: boolean;
  /** Keep guests in the same seats (only meaningful with copyGuests). */
  copyAssignments?: boolean;
}
