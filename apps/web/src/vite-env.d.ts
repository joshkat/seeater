/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the optional sync API. */
  readonly VITE_API_BASE_URL?: string;
  /** Clerk publishable key. Unset → no sign-in; the app is local-only. */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  /** Keyless dev only: sync as this owner id via the x-owner-id header. */
  readonly VITE_DEV_SYNC_OWNER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
