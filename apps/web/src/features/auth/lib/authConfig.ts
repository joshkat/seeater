/**
 * How identity works in this build, decided by env at startup:
 *
 * - Clerk key set  → anyone can use the app signed out (local only); signing
 *   in turns on backup + sync for that account.
 * - No Clerk key, VITE_DEV_SYNC_OWNER set → keyless dev: always "signed in"
 *   as that owner, syncing against a local keyless API.
 * - Neither → purely local app; no sign-in UI, no network calls.
 */
export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || null;

export const devSyncOwner = clerkPublishableKey
  ? null
  : import.meta.env.VITE_DEV_SYNC_OWNER || null;

/** Whether this build can sync at all (some identity source is configured). */
export const syncConfigured = Boolean(clerkPublishableKey || devSyncOwner);
