import { devSyncOwner } from "../features/auth/lib/authConfig";
import { getAuthToken } from "./authToken";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Parsed JSON error body, when the server sent one (e.g. a 409's `current`). */
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Thin typed wrapper around fetch for the sync API. Centralizes the base URL,
 * auth header, JSON handling and error shape. Network failures surface as the
 * fetch TypeError (callers treat that as "offline").
 */
export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  // Only advertise a JSON body when one is actually present — Fastify rejects
  // requests that set Content-Type: application/json with an empty body.
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Clerk session token when signed in. In keyless dev (no Clerk), the local
  // API trusts an x-owner-id header instead — see authConfig.devSyncOwner.
  const token = await getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else if (devSyncOwner) headers.set("x-owner-id", devSyncOwner);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = (body as { message?: string } | null)?.message ?? `Request to ${path} failed`;
    throw new ApiError(message, response.status, body);
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
