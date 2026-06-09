/**
 * Bridges Clerk's session token (only available via React hooks) to the plain
 * `apiClient` fetch wrapper. A component near the root registers Clerk's
 * `getToken` here; `apiClient` then attaches it as a Bearer token.
 */

type TokenGetter = (() => Promise<string | null>) | null;

let getter: TokenGetter = null;

export function setAuthTokenGetter(next: TokenGetter): void {
  getter = next;
}

export async function getAuthToken(): Promise<string | null> {
  if (!getter) return null;
  try {
    return await getter();
  } catch {
    return null;
  }
}
