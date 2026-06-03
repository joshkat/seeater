const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Thin typed wrapper around fetch for talking to @seating/api. Centralizes
 * the base URL, JSON handling, and error shape so feature modules stay small.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  // Only advertise a JSON body when one is actually present — Fastify rejects
  // requests that set Content-Type: application/json with an empty body.
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed`, response.status);
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
