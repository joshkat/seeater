import { ClerkProvider } from "@clerk/clerk-react";

import { App } from "../../../App";
import { useClerkAppearance } from "../hooks/useClerkAppearance";
import { ClerkIdentityBridge } from "./ClerkIdentityBridge";

interface AuthRootProps {
  publishableKey: string;
}

/**
 * Mounts Clerk (theme-matched) around the app. There is no sign-in gate: the
 * app is fully usable signed out, and signing in only adds backup + sync.
 * Rendered from main.tsx only when a publishable key is configured.
 */
export function AuthRoot({ publishableKey }: AuthRootProps): JSX.Element {
  const appearance = useClerkAppearance();

  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" appearance={appearance}>
      <ClerkIdentityBridge />
      <App />
    </ClerkProvider>
  );
}
