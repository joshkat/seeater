import { useSyncStore } from "../store/syncStore";

/** Dismissible one-off sync message (e.g. after signed-out events were moved
 * into the account on sign-in). */
export function SyncNotice(): JSX.Element | null {
  const notice = useSyncStore((state) => state.notice);
  const dismissNotice = useSyncStore((state) => state.dismissNotice);

  if (!notice) return null;

  return (
    <div role="status" className="alert alert-info alert-soft mb-6 text-sm">
      <span>{notice}</span>
      <button type="button" className="btn btn-xs" onClick={dismissNotice}>
        Dismiss
      </button>
    </div>
  );
}
