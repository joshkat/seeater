import { Suspense, lazy } from "react";

import { clerkPublishableKey } from "../lib/authConfig";

// Lazy so Clerk's SDK is only downloaded in builds where sign-in is enabled.
const ClerkAccountButtons = lazy(() =>
  import("./ClerkAccountButtons").then((module) => ({ default: module.ClerkAccountButtons })),
);

/** Header account controls. Renders nothing unless sign-in is enabled. */
export function AuthControls(): JSX.Element | null {
  if (!clerkPublishableKey) return null;
  return (
    <Suspense fallback={null}>
      <ClerkAccountButtons />
    </Suspense>
  );
}
