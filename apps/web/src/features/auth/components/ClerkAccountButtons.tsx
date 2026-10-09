import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

/**
 * Clerk's account buttons: "Sign in to sync" when signed out, the avatar menu
 * when signed in. Nothing renders while Clerk is loading (or can't load, e.g.
 * offline). Only ever loaded lazily, via AuthControls, when sync is enabled.
 */
export function ClerkAccountButtons(): JSX.Element {
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
