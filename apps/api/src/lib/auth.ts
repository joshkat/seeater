import { getAuth } from "@clerk/fastify";
import type { FastifyRequest } from "fastify";

import { env } from "../config/env.js";

/**
 * Ownership resolution.
 *
 * When Clerk is configured (CLERK_SECRET_KEY set), the owner is the verified
 * Clerk user id. When it isn't (local dev without keys), we fall back to an
 * `x-owner-id` header or a fixed dev user so the app + curl smoke tests still
 * work. Every service query filters by this id, so identity is the only thing
 * that changes between dev and real auth.
 */
export const DEV_OWNER_ID = "dev-user";

const clerkConfigured = Boolean(env.CLERK_SECRET_KEY);

function headerOwner(request: FastifyRequest): string | null {
  const header = request.headers["x-owner-id"];
  return typeof header === "string" && header.trim().length > 0 ? header.trim() : null;
}

function unauthorized(): Error {
  const error = new Error("Authentication required") as Error & { statusCode?: number };
  error.statusCode = 401;
  return error;
}

/** Returns the owner id for the request, or throws a 401 when unauthenticated. */
export function getOwnerId(request: FastifyRequest): string {
  if (clerkConfigured) {
    const { userId } = getAuth(request);
    if (userId) return userId;
    // Clerk is on but there's no valid session. Allow an explicit header
    // override outside production so curl-based testing still works.
    if (env.NODE_ENV !== "production") {
      const dev = headerOwner(request);
      if (dev) return dev;
    }
    throw unauthorized();
  }

  // No Clerk configured (local dev): header override, else the shared dev user.
  return headerOwner(request) ?? DEV_OWNER_ID;
}
