import type { MemberRole, SharingResponse } from "@seating/shared";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../../lib/apiClient";
import { requestSync } from "../../sync/engine/accountSession";
import { sharingApi } from "../api/sharingApi";

export interface SharingController {
  /** null while loading (or before the event reached the server). */
  sharing: SharingResponse | null;
  error: string | null;
  busy: boolean;
  invite: (email: string, role: MemberRole) => Promise<boolean>;
  setRole: (email: string, role: MemberRole) => Promise<void>;
  remove: (email: string) => Promise<void>;
  setLink: (enabled: boolean, regenerate?: boolean) => Promise<void>;
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Couldn't reach the server. Check your connection and try again.";
}

/**
 * Who an event is shared with, and the calls that change it. Loads when
 * `ready` (the event has been synced, so the server knows it). Every change
 * asks for a sync pass so the dashboard's "Shared with N" catches up.
 */
export function useSharing(eventId: string, ready: boolean): SharingController {
  const [sharing, setSharing] = useState<SharingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    sharingApi
      .get(eventId)
      .then((loaded) => !cancelled && setSharing(loaded))
      .catch((caught: unknown) => !cancelled && setError(messageOf(caught)));
    return () => {
      cancelled = true;
    };
  }, [eventId, ready]);

  const run = useCallback(async (call: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await call();
      requestSync();
      return true;
    } catch (caught) {
      setError(messageOf(caught));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    sharing,
    error,
    busy,
    invite: (email, role) =>
      run(async () => setSharing(await sharingApi.invite(eventId, email, role))),
    setRole: async (email, role) => {
      await run(async () => setSharing(await sharingApi.setRole(eventId, email, role)));
    },
    remove: async (email) => {
      await run(async () => setSharing(await sharingApi.remove(eventId, email)));
    },
    setLink: async (enabled, regenerate = false) => {
      await run(async () => {
        const link = await sharingApi.setLink(eventId, enabled, regenerate);
        setSharing((current) => (current ? { ...current, link } : current));
      });
    },
  };
}
