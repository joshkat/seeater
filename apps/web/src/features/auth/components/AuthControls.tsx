import { UserButton } from "@clerk/clerk-react";

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

/** The signed-in user avatar + sign-out menu. Renders nothing in keyless dev
 * (no Clerk configured), so headers stay safe either way. */
export function AuthControls(): JSX.Element | null {
  if (!clerkEnabled) return null;
  return <UserButton afterSignOutUrl="/" />;
}
