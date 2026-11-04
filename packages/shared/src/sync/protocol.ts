import { z } from "zod";

import { eventDocSchema } from "../document/schema.js";
import type { EventDoc } from "../document/schema.js";

/**
 * Wire contract for the optional sync API (`/api/events`).
 *
 * The server stores whole documents and a monotonically increasing `version`
 * per document. Every write carries the `baseVersion` the client last saw; the
 * server applies it only if that's still current (compare-and-swap) and
 * otherwise answers 409 with the current version. Deletes leave a tombstone
 * (`deleted: true`) so other devices learn about them.
 */

/** What the caller may do with an event: owners and editors write, viewers read. */
export type EventRole = "owner" | "editor" | "viewer";

/** One row of `GET /api/events`: the caller's own events and those shared with them. */
export interface RemoteEventSummary {
  id: string;
  name: string;
  version: number;
  deleted: boolean;
  updatedAt: string;
  role: EventRole;
  /** The owner's display name (for "Shared by …"). */
  ownerName: string;
  /** How many people it's shared with (owner's view; 0 for members). */
  memberCount: number;
}

export interface ListEventsResponse {
  events: RemoteEventSummary[];
}

/** `GET /api/events/:id`. `data` is null for tombstones. */
export interface RemoteEvent {
  id: string;
  version: number;
  deleted: boolean;
  updatedAt: string;
  data: EventDoc | null;
}

/** `PUT /api/events/:id` body. `baseVersion: null` means "create". */
export const putEventRequestSchema = z.object({
  baseVersion: z.number().int().positive().nullable(),
  data: eventDocSchema,
});
export type PutEventRequest = z.infer<typeof putEventRequestSchema>;

export interface PutEventResponse {
  id: string;
  version: number;
}

/** Body of a 409 from PUT/DELETE: what the server currently holds. */
export interface VersionConflictResponse {
  statusCode: 409;
  error: "Conflict";
  message: string;
  current: { version: number; deleted: boolean };
  /**
   * `idTaken`: a create used an id that already belongs to an event the
   * caller can't see (e.g. two people imported the same backup). The client
   * should give its copy fresh ids and create it again.
   */
  reason?: "idTaken";
}
