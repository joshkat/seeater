import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

import { setAuthTokenGetter } from "../../../lib/authToken";
import { useIdentityStore } from "../store/identityStore";

/**
 * Connects Clerk to the rest of the app. Renders nothing.
 * - Registers Clerk's `getToken` so sync requests carry the session token.
 * - Publishes the signed-in user id (or null) to the identity store, which
 *   switches the local database and starts/stops sync.
 *
 * A "signed out" reading while the browser is offline is ignored: Clerk can't
 * refresh a session without the network, and flipping to the signed-out
 * database would make the user's events look like they vanished.
 */
export function ClerkIdentityBridge(): null {
  const { isLoaded, userId, getToken } = useAuth();
  const setUserId = useIdentityStore((state) => state.setUserId);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId && !navigator.onLine) return;
    setUserId(userId ?? null);
  }, [isLoaded, userId, setUserId]);

  return null;
}
