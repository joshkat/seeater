import { ClerkProvider } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { AuthGate } from "./features/auth/components/AuthGate";
import { restoreTheme } from "./lib/theme";
import "./styles/global.css";

// Restore the user's saved theme immediately so there's no flash.
restoreTheme();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

// When Clerk is configured, gate the app behind sign-in. Without a key, run in
// keyless dev mode (no auth) so local development works out of the box.
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(rootElement).render(
  <StrictMode>
    {clerkKey ? (
      <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
        <AuthGate />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
