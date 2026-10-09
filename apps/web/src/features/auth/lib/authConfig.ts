/**
 * How identity works in this build, decided by env at build time.
 *
 * Sign-in and sync are **switched off by default**: the product is local-only
 * for now. Set VITE_ENABLE_SYNC=true to turn them back on; then:
 *
 * - Clerk key set  → anyone can use the app signed out (local only); signing
 *   in turns on backup + sync for that account.
 * - No Clerk key, VITE_DEV_SYNC_OWNER set → keyless dev: always "signed in"
 *   as that owner, syncing against a local keyless API.
 * - Neither → purely local app.
 *
 * With the flag off (the default) none of the sign-in UI renders, Clerk is
 * never downloaded, and the app makes no network requests at all.
 */
export const syncEnabled = import.meta.env.VITE_ENABLE_SYNC === "true";

export const clerkPublishableKey = syncEnabled
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || null
  : null;

export const devSyncOwner =
  syncEnabled && !clerkPublishableKey ? import.meta.env.VITE_DEV_SYNC_OWNER || null : null;

/** Whether this build can sync at all (enabled, with some identity source). */
export const syncConfigured = Boolean(clerkPublishableKey || devSyncOwner);
