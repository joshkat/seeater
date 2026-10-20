import { syncConfigured } from "../../auth/lib/authConfig";
import {
  type TrashedEvent,
  deleteEvent,
  restoreFromTrash,
} from "../../storage/repository/eventRepository";
import { activeDb } from "../../storage/store/storageStore";
import { daysUntil } from "../lib/daysUntil";
import { relativeTime } from "../lib/relativeTime";

/** One event in the trash: restore it, or delete it for good. */
export function TrashRow({ event }: { event: TrashedEvent }): JSX.Element {
  const { summary } = event;
  const daysLeft = daysUntil(event.purgeAt);

  async function handleDeleteForever(): Promise<void> {
    const ok = window.confirm(
      `Delete “${summary.name}” for good? This can’t be undone${
        syncConfigured ? " (it’s also removed from your account if you’re signed in)" : ""
      }.`,
    );
    if (ok) await deleteEvent(activeDb(), summary.id);
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-box border border-base-300 bg-base-100 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{summary.name}</p>
        <p className="text-xs text-base-content/60">
          {summary.tableCount} table{summary.tableCount === 1 ? "" : "s"} · {summary.guestCount}{" "}
          guest{summary.guestCount === 1 ? "" : "s"} · moved to trash{" "}
          {relativeTime(event.trashedAt)}
        </p>
        <p className="text-xs text-warning">
          {daysLeft === 0
            ? "Deleted for good today"
            : `Deleted for good in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
        </p>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => void restoreFromTrash(activeDb(), summary.id)}
      >
        Restore
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm text-error"
        onClick={() => void handleDeleteForever()}
      >
        Delete forever
      </button>
    </li>
  );
}
