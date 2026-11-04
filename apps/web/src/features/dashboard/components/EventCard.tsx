import { useState } from "react";
import { useNavigate } from "react-router";

import { downloadEventBackup } from "../../backup/lib/backupActions";
import {
  type DashboardEvent,
  deleteEvent,
  renameEvent,
  trashEvent,
} from "../../storage/repository/eventRepository";
import { activeDb } from "../../storage/store/storageStore";
import { relativeTime } from "../lib/relativeTime";
import { DuplicateDialog } from "./DuplicateDialog";
import { EventSharingBadge } from "./EventSharingBadge";
import { LeaveEventDialog } from "./LeaveEventDialog";

interface EventCardProps {
  event: DashboardEvent;
  /** Called after the event is moved to the trash (for the Undo banner). */
  onTrashed: (event: { id: string; name: string }) => void;
}

/**
 * A single event tile on the dashboard: open it, or rename/duplicate/trash.
 * Events shared with you can't be trashed (they're not yours): "Remove from
 * my list" leaves them instead, and viewers open the read-only view.
 * The dashboard list is live, so changes here re-render it automatically.
 */
export function EventCard({ event, onTrashed }: EventCardProps): JSX.Element {
  const { summary, role } = event;
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(summary.name);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const openPath = role === "viewer" ? `/events/${summary.id}/view` : `/events/${summary.id}`;

  async function commitRename(): Promise<void> {
    const trimmed = name.trim();
    setRenaming(false);
    if (!trimmed || trimmed === summary.name) {
      setName(summary.name);
      return;
    }
    await renameEvent(activeDb(), summary.id, trimmed);
  }

  // Reversible (trash + Undo banner), so no confirmation dialog.
  async function handleTrash(): Promise<void> {
    await trashEvent(activeDb(), summary.id);
    onTrashed({ id: summary.id, name: summary.name });
  }

  // The next sync pass leaves the event on the server (planSync "leave"), so
  // this works offline too.
  async function handleLeave(): Promise<void> {
    setConfirmLeave(false);
    await deleteEvent(activeDb(), summary.id);
  }

  return (
    <div className="group relative flex flex-col rounded-box border border-base-300 bg-base-100 p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md">
      {/* Overflow menu (top-right) */}
      <div
        className="dropdown dropdown-end absolute right-2 top-2"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          tabIndex={0}
          className="btn btn-ghost btn-xs btn-square"
          aria-label="Event actions"
        >
          ⋯
        </button>
        <ul className="dropdown-content menu z-10 w-44 rounded-box border border-base-300 bg-base-100 p-1 text-sm shadow-lg">
          {role !== "viewer" && (
            <li>
              <button type="button" onClick={() => setRenaming(true)}>
                Rename
              </button>
            </li>
          )}
          <li>
            <button type="button" onClick={() => setShowDuplicate(true)}>
              Duplicate
            </button>
          </li>
          <li>
            <button type="button" onClick={() => void downloadEventBackup(summary.id)}>
              Download backup
            </button>
          </li>
          <li>
            {role === "owner" ? (
              <button type="button" className="text-error" onClick={() => void handleTrash()}>
                Move to trash
              </button>
            ) : (
              <button type="button" className="text-error" onClick={() => setConfirmLeave(true)}>
                Remove from my list
              </button>
            )}
          </li>
        </ul>
      </div>

      {/* Clickable body opens the event (disabled while renaming) */}
      <button
        type="button"
        className="flex flex-1 flex-col items-start gap-2 pr-6 text-left"
        onClick={() => !renaming && navigate(openPath)}
        disabled={renaming}
      >
        {renaming ? (
          <input
            autoFocus
            className="input input-bordered input-sm w-full"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onBlur={() => void commitRename()}
            onKeyDown={(event) => {
              if (event.key === "Enter") void commitRename();
              if (event.key === "Escape") {
                setName(summary.name);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <span className="line-clamp-2 text-[15px] font-semibold text-base-content">
            {summary.name}
          </span>
        )}

        <EventSharingBadge event={event} />
        <span className="text-xs text-base-content/60">
          {summary.tableCount} table{summary.tableCount === 1 ? "" : "s"} · {summary.guestCount}{" "}
          guest{summary.guestCount === 1 ? "" : "s"}
        </span>
        <span className="mt-auto text-[11px] text-base-content/70">
          Edited {relativeTime(summary.updatedAt)}
        </span>
      </button>

      {confirmLeave && (
        <LeaveEventDialog
          name={summary.name}
          ownerName={event.ownerName}
          onConfirm={() => void handleLeave()}
          onClose={() => setConfirmLeave(false)}
        />
      )}
      {showDuplicate && (
        <DuplicateDialog
          sourceId={summary.id}
          sourceName={summary.name}
          onClose={() => setShowDuplicate(false)}
        />
      )}
    </div>
  );
}
