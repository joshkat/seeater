import type {
  EventDoc,
  ListEventsResponse,
  PutEventResponse,
  RemoteEvent,
  VersionConflictResponse,
} from "@seating/shared";

import { ApiError, apiFetch, apiRequest } from "../../../lib/apiClient";

/**
 * Result of a conditional write: accepted at `version`, or rejected as stale.
 * `reason: "idTaken"` means the id belongs to someone else's event.
 */
export type RemoteWriteResult =
  | { ok: true; version: number }
  | { ok: false; current: VersionConflictResponse["current"]; reason?: "idTaken" };

/** Floor-plan image bytes as the sync engine moves them. */
export interface RemoteImage {
  mimeType: string;
  width: number;
  height: number;
  data: ArrayBuffer;
}

/** The calls the sync engine makes. An interface so tests can fake the server. */
export interface SyncApi {
  list: () => Promise<ListEventsResponse>;
  get: (id: string) => Promise<RemoteEvent>;
  put: (doc: EventDoc, baseVersion: number | null) => Promise<RemoteWriteResult>;
  remove: (id: string, baseVersion: number) => Promise<RemoteWriteResult>;
  /** Removes a shared event from the caller's list (not the owner's). */
  leave: (id: string) => Promise<void>;
  uploadImage: (eventId: string, imageId: string, image: RemoteImage) => Promise<void>;
  /** The image, or null if the server doesn't have it (yet). */
  downloadImage: (eventId: string, imageId: string) => Promise<RemoteImage | null>;
}

const path = (id: string) => `/events/${encodeURIComponent(id)}`;

function asConflict(error: unknown): RemoteWriteResult | null {
  if (error instanceof ApiError && error.status === 409) {
    const body = error.body as VersionConflictResponse;
    return { ok: false, current: body.current, ...(body.reason ? { reason: body.reason } : {}) };
  }
  return null;
}

const imagePath = (eventId: string, imageId: string) =>
  `${path(eventId)}/images/${encodeURIComponent(imageId)}`;

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

  leave: (id) => apiRequest<void>(`${path(id)}/membership`, { method: "DELETE" }),

  async uploadImage(eventId, imageId, image) {
    await apiFetch(imagePath(eventId, imageId), {
      method: "PUT",
      headers: {
        "Content-Type": image.mimeType,
        "x-image-width": String(image.width),
        "x-image-height": String(image.height),
      },
      body: image.data,
    });
  },

  async downloadImage(eventId, imageId) {
    try {
      const response = await apiFetch(imagePath(eventId, imageId));
      return {
        mimeType: response.headers.get("content-type") ?? "image/png",
        width: Number(response.headers.get("x-image-width")) || 0,
        height: Number(response.headers.get("x-image-height")) || 0,
        data: await response.arrayBuffer(),
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
};
