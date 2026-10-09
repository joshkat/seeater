import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { AuthRoot } from "./features/auth/components/AuthRoot";
import { clerkPublishableKey } from "./features/auth/lib/authConfig";
import { startAccountSession } from "./features/sync/engine/accountSession";
import { restoreTheme } from "./lib/theme";
import "./styles/global.css";

// Restore the user's saved theme immediately so there's no flash.
restoreTheme();

// Open the right local database (signed-out, or the last signed-in account)
// and start background sync if signed in. Runs before the first render.
startAccountSession();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

// The app never requires sign-in. With a Clerk key, Clerk is mounted so users
// can optionally sign in to back up and sync; without one it's local-only.
createRoot(rootElement).render(
  <StrictMode>
    {clerkPublishableKey ? <AuthRoot publishableKey={clerkPublishableKey} /> : <App />}
  </StrictMode>,
);
