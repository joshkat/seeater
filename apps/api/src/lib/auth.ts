import { clerkClient, getAuth } from "@clerk/fastify";
import type { FastifyRequest } from "fastify";

import { env } from "../config/env.js";

/**
 * Who is calling.
 *
 * When Clerk is configured (CLERK_SECRET_KEY set), the user id comes from the
 * verified Clerk session and the email + name from Clerk's user record (only a
 * **verified** primary email counts, since invites are matched by email).
 * Without Clerk (local dev), `x-owner-id`, `x-owner-email` and `x-owner-name`
 * headers stand in, so two fake users can share events with curl or two dev
 * servers. Production refuses to start without Clerk (config/env.ts).
 */
export const DEV_OWNER_ID = "dev-user";

export interface Caller {
  userId: string;
  /** Lower-cased verified email, or null if the account has none. */
  email: string | null;
  /** Display name shown to collaborators. */
  name: string;
}

const clerkConfigured = Boolean(env.CLERK_SECRET_KEY);

function header(request: FastifyRequest, name: string): string | null {
  const value = request.headers[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function unauthorized(): Error {
  const error = new Error("Authentication required") as Error & { statusCode?: number };
  error.statusCode = 401;
  return error;
}

function headerCaller(request: FastifyRequest, userId: string): Caller {
  const email = header(request, "x-owner-email")?.toLowerCase() ?? null;
  return { userId, email, name: header(request, "x-owner-name") ?? email ?? userId };
}

/** Clerk profile lookups, cached briefly: every sync pass would otherwise hit Clerk. */
const PROFILE_TTL_MS = 5 * 60_000;
const MAX_CACHED_PROFILES = 1000;
const profiles = new Map<string, { at: number; email: string | null; name: string }>();

async function clerkProfile(userId: string): Promise<{ email: string | null; name: string }> {
  const cached = profiles.get(userId);
  if (cached && Date.now() - cached.at < PROFILE_TTL_MS) return cached;

  const user = await clerkClient.users.getUser(userId);
  const primary = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId);
  const email =
    primary && primary.verification?.status === "verified"
      ? primary.emailAddress.toLowerCase()
      : null;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const name = fullName || user.username || email || "Someone";

  if (profiles.size >= MAX_CACHED_PROFILES) profiles.clear();
  const entry = { at: Date.now(), email, name };
  profiles.set(userId, entry);
  return entry;
}

/** Returns the caller's user id, or throws a 401. Cheap: no profile lookup. */
export function getUserId(request: FastifyRequest): string {
  if (clerkConfigured) {
    const { userId } = getAuth(request);
    if (userId) return userId;
    // Clerk is on but there's no valid session. Allow an explicit header
    // override outside production so curl-based testing still works.
    if (env.NODE_ENV !== "production") {
      const dev = header(request, "x-owner-id");
      if (dev) return dev;
    }
    throw unauthorized();
  }
  return header(request, "x-owner-id") ?? DEV_OWNER_ID;
}

/** Returns the caller with email and display name, or throws a 401. */
export async function getCaller(request: FastifyRequest): Promise<Caller> {
  const userId = getUserId(request);
  if (clerkConfigured && getAuth(request).userId === userId) {
    return { userId, ...(await clerkProfile(userId)) };
  }
  return headerCaller(request, userId);
}
