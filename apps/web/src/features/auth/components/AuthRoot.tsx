import { ClerkProvider } from "@clerk/clerk-react";

import { AuthGate } from "./AuthGate";
import { useClerkAppearance } from "../hooks/useClerkAppearance";

interface AuthRootProps {
  publishableKey: string;
}

/** Mounts Clerk with a theme-matched appearance and the sign-in gate. Rendered
 * from main.tsx only when a publishable key is configured. */
export function AuthRoot({ publishableKey }: AuthRootProps): JSX.Element {
  const appearance = useClerkAppearance();

  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" appearance={appearance}>
      <AuthGate />
    </ClerkProvider>
  );
}
