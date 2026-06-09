import { SignedIn, SignedOut } from "@clerk/clerk-react";

import { App } from "../../../App";
import { AuthTokenBridge } from "./AuthTokenBridge";
import { SignInScreen } from "./SignInScreen";

/** Wraps the app in Clerk's auth state: the sign-in screen when signed out, the
 * full app (plus token bridge) when signed in. Only mounted when Clerk is
 * configured (see main.tsx). */
export function AuthGate(): JSX.Element {
  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
      <SignedIn>
        <AuthTokenBridge />
        <App />
      </SignedIn>
    </>
  );
}
