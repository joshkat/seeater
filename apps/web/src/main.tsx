import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { clerkPublishableKey } from "./features/auth/lib/authConfig";
import { startAccountSession } from "./features/sync/engine/accountSession";
import { restoreTheme } from "./lib/theme";
import "./styles/global.css";

// Restore the user's saved theme immediately so there's no flash.
restoreTheme();

// Open the right local database (signed-out, or the last signed-in account)
// and start background sync if signed in. Runs before the first render. With
// sync disabled (the default) this just opens the local database.
startAccountSession();

// Lazy so Clerk's SDK is only downloaded in builds where sign-in is enabled.
const AuthRoot = lazy(() =>
  import("./features/auth/components/AuthRoot").then((module) => ({ default: module.AuthRoot })),
);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

// The app never requires sign-in. Only when sync is enabled (VITE_ENABLE_SYNC)
// and a Clerk key is set is Clerk mounted, for optional sign-in; otherwise the
// app is local-only.
createRoot(rootElement).render(
  <StrictMode>
    {clerkPublishableKey ? (
      <Suspense fallback={null}>
        <AuthRoot publishableKey={clerkPublishableKey} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
