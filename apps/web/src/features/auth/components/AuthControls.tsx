import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

import { clerkPublishableKey } from "../lib/authConfig";

/**
 * Header account controls: a "Sign in to sync" button when signed out, the
 * avatar menu when signed in. Renders nothing when Clerk isn't configured, and
 * nothing while Clerk is still loading (or can't load, e.g. offline).
 */
export function AuthControls(): JSX.Element | null {
  if (!clerkPublishableKey) return null;
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className="btn btn-outline btn-sm">
            Sign in to sync
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
