import type { FloorPlanSummary } from "@seating/shared";
import { useState } from "react";

import { deleteFloorPlan, updateFloorPlan } from "../../editor/api/floorPlanApi";
import { relativeTime } from "../lib/relativeTime";
import { useNavStore } from "../store/navStore";
import { DuplicateDialog } from "./DuplicateDialog";

interface EventCardProps {
  summary: FloorPlanSummary;
  onChanged: () => void;
}

/** A single event tile on the dashboard: open it, or rename/duplicate/delete. */
export function EventCard({ summary, onChanged }: EventCardProps): JSX.Element {
  const openEvent = useNavStore((state) => state.openEvent);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(summary.name);
  const [showDuplicate, setShowDuplicate] = useState(false);

  async function commitRename(): Promise<void> {
    const trimmed = name.trim();
    setRenaming(false);
    if (!trimmed || trimmed === summary.name) {
      setName(summary.name);
      return;
    }
    await updateFloorPlan(summary.id, { name: trimmed });
    onChanged();
  }

  async function handleDelete(): Promise<void> {
    const ok = window.confirm(
      `Delete “${summary.name}”? This permanently removes the chart and its ${summary.guestCount} guest(s).`,
    );
    if (!ok) return;
    await deleteFloorPlan(summary.id);
    onChanged();
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
        <ul className="dropdown-content menu z-10 w-36 rounded-box border border-base-300 bg-base-100 p-1 text-sm shadow-lg">
          <li>
            <button type="button" onClick={() => setRenaming(true)}>
              Rename
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setShowDuplicate(true)}>
              Duplicate
            </button>
          </li>
          <li>
            <button type="button" className="text-error" onClick={() => void handleDelete()}>
              Delete
            </button>
          </li>
        </ul>
      </div>

      {/* Clickable body opens the event (disabled while renaming) */}
      <button
        type="button"
        className="flex flex-1 flex-col items-start gap-2 pr-6 text-left"
        onClick={() => !renaming && openEvent(summary.id)}
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

        <span className="text-xs text-base-content/60">
          {summary.tableCount} table{summary.tableCount === 1 ? "" : "s"} · {summary.guestCount}{" "}
          guest{summary.guestCount === 1 ? "" : "s"}
        </span>
        <span className="mt-auto text-[11px] text-base-content/40">
          Edited {relativeTime(summary.updatedAt)}
        </span>
      </button>

      {showDuplicate && (
        <DuplicateDialog
          sourceId={summary.id}
          sourceName={summary.name}
          onClose={() => setShowDuplicate(false)}
          onDuplicated={onChanged}
        />
      )}
    </div>
  );
}
