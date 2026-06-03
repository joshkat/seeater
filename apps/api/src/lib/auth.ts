import type { FastifyRequest } from "fastify";

/**
 * Dev-time ownership resolution.
 *
 * Real auth (Clerk) is a later milestone. Until then we derive the owner from
 * an `x-owner-id` header, falling back to a fixed dev user, so ownership is
 * modeled correctly throughout the API and swapping in real auth later is a
 * localized change.
 */
export const DEV_OWNER_ID = "dev-user";

export function getOwnerId(request: FastifyRequest): string {
  const header = request.headers["x-owner-id"];
  if (typeof header === "string" && header.trim().length > 0) {
    return header.trim();
  }
  return DEV_OWNER_ID;
}
