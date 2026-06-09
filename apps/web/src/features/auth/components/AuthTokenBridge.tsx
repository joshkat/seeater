import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

import { setAuthTokenGetter } from "../../../lib/authToken";

/** Registers Clerk's `getToken` with the apiClient so signed-in API requests
 * carry the session token. Renders nothing. */
export function AuthTokenBridge(): null {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}
