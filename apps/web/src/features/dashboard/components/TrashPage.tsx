import { Link } from "react-router";

import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { deleteEvent } from "../../storage/repository/eventRepository";
import { activeDb } from "../../storage/store/storageStore";
import { usePurgeExpiredTrash } from "../hooks/usePurgeExpiredTrash";
import { useTrashedEvents } from "../hooks/useTrashedEvents";
import { TrashRow } from "./TrashRow";

/** `/trash`: deleted events, restorable for 30 days. */
export function TrashPage(): JSX.Element {
  usePurgeExpiredTrash();
  useDocumentTitle("Trash · Seating");
  const trashed = useTrashedEvents();

  async function handleEmpty(): Promise<void> {
    if (!trashed?.length) return;
    const ok = window.confirm(
      `Delete all ${trashed.length} event${trashed.length === 1 ? "" : "s"} in the trash for good? This can’t be undone.`,
    );
    if (!ok) return;
    for (const event of trashed) await deleteEvent(activeDb(), event.summary.id);
  }

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn btn-secondary btn-sm">
              ← Events
            </Link>
            <h1 className="text-xl font-bold">Trash</h1>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm text-error"
            disabled={!trashed?.length}
            onClick={() => void handleEmpty()}
          >
            Empty trash
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <p className="mb-4 text-sm text-base-content/60">
          Deleted events stay here for 30 days, then they’re deleted for good.
        </p>
        {trashed === undefined && <p className="text-sm text-base-content/60">Loading…</p>}
        {trashed?.length === 0 && (
          <div className="rounded-box border border-dashed border-base-300 p-12 text-center text-sm text-base-content/60">
            The trash is empty.
          </div>
        )}
        {trashed !== undefined && trashed.length > 0 && (
          <ul className="flex flex-col gap-2">
            {trashed.map((event) => (
              <TrashRow key={event.summary.id} event={event} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
