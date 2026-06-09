import { apiRequest } from "../../lib/apiClient";

export interface HealthResponse {
  status: string;
  timestamp: string;
}

/** Fetches the API health-check endpoint. */
export function fetchHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}
