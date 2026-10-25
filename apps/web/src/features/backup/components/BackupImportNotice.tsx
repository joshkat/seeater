import type { BackupImportResult } from "./ImportBackupButton";

/** The outcome of "Import backup", under the dashboard header: a
 * confirmation, or (role="alert") what a backup is and where to get one. */
export function BackupImportNotice({
  result,
  onDismiss,
}: {
  result: BackupImportResult;
  onDismiss: () => void;
}): JSX.Element {
  return (
    <div
      role={result.ok ? "status" : "alert"}
      className={`alert mb-4 flex justify-between py-2 text-sm ${
        result.ok ? "alert-success" : "alert-error"
      }`}
    >
      <span>
        {result.ok
          ? `Imported “${result.name}”.`
          : "That file isn’t a seating-chart backup. Backups end in .seating.json and come from ⋯ → Download backup on an event."}
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        className="btn btn-ghost btn-sm btn-square"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}
