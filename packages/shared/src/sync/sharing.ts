import { z } from "zod";

import { eventDocSchema } from "../document/schema.js";
import type { EventDoc } from "../document/schema.js";

/**
 * Wire contract for sharing: invites by email (editor / viewer), the public
 * read-only link, the "one editor at a time" lock and floor-plan images.
 * All under `/api/events/:id/…`, except the public `/api/shared/:token`.
 */

export const memberRoleSchema = z.enum(["editor", "viewer"]);
export type MemberRole = z.infer<typeof memberRoleSchema>;

/** Emails are compared lower-cased and trimmed. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Someone an event is shared with. `accepted` once they've signed in and seen it. */
export interface ShareMember {
  email: string;
  role: MemberRole;
  accepted: boolean;
}

/** Most people one event can be shared with. */
export const MAX_EVENT_MEMBERS = 50;

/** `GET /api/events/:id/members`. */
export interface SharingResponse {
  ownerName: string;
  members: ShareMember[];
  /** Only the owner sees the link; null for editors. */
  link: ShareLinkState | null;
}

export interface ShareLinkState {
  enabled: boolean;
  /** The secret part of `/s/:token`; null until the link was first turned on. */
  token: string | null;
}

/** `POST /api/events/:id/members`. */
export const inviteMemberRequestSchema = z.object({ email: emailSchema, role: memberRoleSchema });
export type InviteMemberRequest = z.infer<typeof inviteMemberRequestSchema>;

/** `PATCH /api/events/:id/members/:email`. */
export const updateMemberRequestSchema = z.object({ role: memberRoleSchema });
export type UpdateMemberRequest = z.infer<typeof updateMemberRequestSchema>;

/** `POST /api/events/:id/share-link`. `regenerate` makes old links stop working. */
export const shareLinkRequestSchema = z.object({
  enabled: z.boolean(),
  regenerate: z.boolean().optional(),
});
export type ShareLinkRequest = z.infer<typeof shareLinkRequestSchema>;

/** `GET /api/shared/:token`: the read-only document behind a public link. */
export interface SharedEventResponse {
  id: string;
  version: number;
  updatedAt: string;
  ownerName: string;
  data: EventDoc;
}

export const sharedEventResponseSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  updatedAt: z.string(),
  ownerName: z.string(),
  data: eventDocSchema,
});

/** How long a lock lasts without a renewal. Clients renew well inside it. */
export const EDIT_LOCK_TTL_MS = 90_000;

/** `PUT /api/events/:id/lock`. `clientId` identifies the browser tab. */
export const lockRequestSchema = z.object({
  clientId: z.string().min(8).max(100),
  /** Take the lock even if someone else holds it ("Edit anyway"). */
  force: z.boolean().optional(),
});
export type LockRequest = z.infer<typeof lockRequestSchema>;

export interface LockHolder {
  userId: string;
  name: string;
  /** True when the holder is the caller in another tab or device. */
  isYou: boolean;
}

/** `PUT /api/events/:id/lock`: you hold it now, or someone else does. */
export type LockResponse =
  | { held: true; expiresAt: string }
  | { held: false; holder: LockHolder; expiresAt: string };

/** `GET /api/events/:id/lock`: who's editing right now, if anyone. */
export interface LockStatusResponse {
  holder: LockHolder | null;
  expiresAt: string | null;
}

/** Largest floor-plan image the server stores (bytes). */
export const MAX_SYNCED_IMAGE_BYTES = 15 * 1024 * 1024;

/** Raster types only: SVG can carry script and images are served publicly. */
export const imageMimeTypeSchema = z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** Most floor-plan images stored per event (one per layout is typical). */
export const MAX_IMAGES_PER_EVENT = 30;

/** Image metadata. Uploads send width/height as `x-image-width`/`x-image-height`. */
export interface RemoteImageMeta {
  id: string;
  mimeType: string;
  width: number;
  height: number;
}

/** `GET /api/events/:id/images`: which images the server already has. */
export interface ListImagesResponse {
  images: RemoteImageMeta[];
}
