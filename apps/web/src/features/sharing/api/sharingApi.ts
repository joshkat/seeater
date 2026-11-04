import type {
  LockResponse,
  LockStatusResponse,
  MemberRole,
  ShareLinkState,
  SharedEventResponse,
  SharingResponse,
} from "@seating/shared";

import { apiFetch, apiRequest } from "../../../lib/apiClient";

const eventPath = (id: string) => `/events/${encodeURIComponent(id)}`;
const memberPath = (id: string, email: string) =>
  `${eventPath(id)}/members/${encodeURIComponent(email)}`;

/** Sharing calls made from the Share dialog and the edit lock. */
export const sharingApi = {
  get: (eventId: string) => apiRequest<SharingResponse>(`${eventPath(eventId)}/members`),

  invite: (eventId: string, email: string, role: MemberRole) =>
    apiRequest<SharingResponse>(`${eventPath(eventId)}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  setRole: (eventId: string, email: string, role: MemberRole) =>
    apiRequest<SharingResponse>(memberPath(eventId, email), {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  remove: (eventId: string, email: string) =>
    apiRequest<SharingResponse>(memberPath(eventId, email), { method: "DELETE" }),

  setLink: (eventId: string, enabled: boolean, regenerate = false) =>
    apiRequest<ShareLinkState>(`${eventPath(eventId)}/share-link`, {
      method: "POST",
      body: JSON.stringify({ enabled, regenerate }),
    }),

  lockStatus: (eventId: string) => apiRequest<LockStatusResponse>(`${eventPath(eventId)}/lock`),

  acquireLock: (eventId: string, clientId: string, force = false) =>
    apiRequest<LockResponse>(`${eventPath(eventId)}/lock`, {
      method: "PUT",
      body: JSON.stringify({ clientId, force }),
    }),

  /** `keepalive` so it still goes out while the tab is closing. */
  releaseLock: (eventId: string, clientId: string) =>
    apiFetch(`${eventPath(eventId)}/lock?clientId=${encodeURIComponent(clientId)}`, {
      method: "DELETE",
      keepalive: true,
    }).then(() => undefined),

  /** Public, no sign-in: the event behind a share link. */
  shared: (token: string) =>
    apiRequest<SharedEventResponse>(`/shared/${encodeURIComponent(token)}`),

  sharedImageUrl: (token: string, imageId: string) =>
    `/shared/${encodeURIComponent(token)}/images/${encodeURIComponent(imageId)}`,
};
