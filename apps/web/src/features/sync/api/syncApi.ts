import type {
  EventDoc,
  ListEventsResponse,
  PutEventResponse,
  RemoteEvent,
  VersionConflictResponse,
} from "@seating/shared";

import { ApiError, apiRequest } from "../../../lib/apiClient";

/** Result of a conditional write: accepted at `version`, or rejected as stale. */
export type RemoteWriteResult =
  | { ok: true; version: number }
  | { ok: false; current: VersionConflictResponse["current"] };

/** The calls the sync engine makes. An interface so tests can fake the server. */
export interface SyncApi {
  list: () => Promise<ListEventsResponse>;
  get: (id: string) => Promise<RemoteEvent>;
  put: (doc: EventDoc, baseVersion: number | null) => Promise<RemoteWriteResult>;
  remove: (id: string, baseVersion: number) => Promise<RemoteWriteResult>;
}

function asConflict(error: unknown): RemoteWriteResult | null {
  if (error instanceof ApiError && error.status === 409) {
    return { ok: false, current: (error.body as VersionConflictResponse).current };
  }
  return null;
}

const path = (id: string) => `/events/${encodeURIComponent(id)}`;

/** The real HTTP implementation against `/api/events`. */
export const httpSyncApi: SyncApi = {
  list: () => apiRequest<ListEventsResponse>("/events"),

  get: (id) => apiRequest<RemoteEvent>(path(id)),

  async put(doc, baseVersion) {
    try {
      const response = await apiRequest<PutEventResponse>(path(doc.id), {
        method: "PUT",
        body: JSON.stringify({ baseVersion, data: doc }),
      });
      return { ok: true, version: response.version };
    } catch (error) {
      const conflict = asConflict(error);
      if (conflict) return conflict;
      throw error;
    }
  },

  async remove(id, baseVersion) {
    try {
      await apiRequest<void>(`${path(id)}?baseVersion=${baseVersion}`, { method: "DELETE" });
      return { ok: true, version: baseVersion + 1 };
    } catch (error) {
      const conflict = asConflict(error);
      if (conflict) return conflict;
      throw error;
    }
  },
};
