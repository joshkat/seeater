/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" turns optional sign-in + sync on. Off by default (local-only app). */
  readonly VITE_ENABLE_SYNC?: string;
  /** Base URL of the optional sync API. */
  readonly VITE_API_BASE_URL?: string;
  /** Clerk publishable key. Unset → no sign-in; the app is local-only. */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  /** Keyless dev only: sync as this owner id via the x-owner-id header. */
  readonly VITE_DEV_SYNC_OWNER?: string;
  /** Keyless dev only: the fake owner's email (for invites). Default `<owner>@example.com`. */
  readonly VITE_DEV_SYNC_EMAIL?: string;
  /** Keyless dev only: the fake owner's display name. Default the owner id. */
  readonly VITE_DEV_SYNC_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
