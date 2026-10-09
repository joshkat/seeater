import { type SyncStatus, useSyncStore } from "../store/syncStore";

const LABEL: Record<Exclude<SyncStatus, "disabled">, string> = {
  idle: "Synced",
  syncing: "Syncing…",
  offline: "Offline",
  error: "Sync paused",
};

const TONE: Record<Exclude<SyncStatus, "disabled">, string> = {
  idle: "badge-success",
  syncing: "badge-warning",
  offline: "badge-ghost",
  error: "badge-error",
};

/**
 * Account sync state, shown next to the account controls. Hidden when signed
 * out — then the "Sign in to sync" button is the call to action instead.
 */
export function SyncStatusBadge(): JSX.Element | null {
  const status = useSyncStore((state) => state.status);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const lastError = useSyncStore((state) => state.lastError);

  if (status === "disabled") return null;

  const title =
    status === "error"
      ? (lastError ?? "Sync failed")
      : status === "offline"
        ? "Changes are saved on this device and will sync when you're back online."
        : lastSyncedAt
          ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
          : undefined;

  return (
    <span className={`badge badge-soft badge-sm ${TONE[status]}`} title={title}>
      {LABEL[status]}
    </span>
  );
}
