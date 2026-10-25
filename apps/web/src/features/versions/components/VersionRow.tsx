import type { EventVersionRecord } from "../../storage/db/SeatingDb";
import { relativeTime } from "../../dashboard/lib/relativeTime";

interface VersionRowProps {
  version: EventVersionRecord;
  busy: boolean;
  onRestore: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

/** One saved version: what and when, plus restore / copy / delete. */
export function VersionRow({
  version,
  busy,
  onRestore,
  onCopy,
  onDelete,
}: VersionRowProps): JSX.Element {
  const { summary } = version;
  const named = version.kind === "named";

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-box border border-base-300 p-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-semibold">
          {version.label}
          <span className={`badge badge-sm ${named ? "badge-primary" : "badge-ghost"}`}>
            {named ? "Saved" : "Auto"}
          </span>
        </p>
        <p className="text-xs text-base-content/60">
          <time dateTime={version.createdAt} title={new Date(version.createdAt).toLocaleString()}>
            {relativeTime(version.createdAt)}
          </time>{" "}
          · {summary.tableCount} table{summary.tableCount === 1 ? "" : "s"} · {summary.seatedCount}/
          {summary.guestCount} seated
        </p>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={onRestore}
        >
          Restore
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy}
          title="Open this version as a separate event"
          onClick={onCopy}
        >
          Copy as new event
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square text-base-content/60"
          aria-label={`Delete version “${version.label}”`}
          title="Delete this version"
          disabled={busy}
          onClick={onDelete}
        >
          ×
        </button>
      </div>
    </li>
  );
}
