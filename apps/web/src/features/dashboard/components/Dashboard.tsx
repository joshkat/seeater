import { useCallback, useState } from "react";

import { ThemeMenu } from "../../../components/ThemeMenu";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { AuthControls } from "../../auth/components/AuthControls";
import { ImportBackupButton } from "../../backup/components/ImportBackupButton";
import { SyncNotice } from "../../sync/components/SyncNotice";
import { SyncStatusBadge } from "../../sync/components/SyncStatusBadge";
import { useEventSummaries } from "../hooks/useEventSummaries";
import { usePurgeExpiredTrash } from "../hooks/usePurgeExpiredTrash";
import { EventCard } from "./EventCard";
import { NewEventButton } from "./NewEventButton";
import { SampleEventButton } from "./SampleEventButton";
import { TrashLink } from "./TrashLink";
import { TrashUndoNotice } from "./TrashUndoNotice";

/** The "My Events" landing page: every seating chart on this device as a tile. */
export function Dashboard(): JSX.Element {
  const summaries = useEventSummaries();
  usePurgeExpiredTrash();
  useDocumentTitle("My events · Seating");
  const [lastTrashed, setLastTrashed] = useState<{ id: string; name: string } | null>(null);
  const clearLastTrashed = useCallback(() => setLastTrashed(null), []);

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4 max-sm:px-4">
          <h1 className="text-xl font-bold">My Events</h1>
          <div className="flex flex-wrap items-center gap-3">
            <TrashLink />
            <ImportBackupButton />
            <NewEventButton />
            <ThemeMenu />
            <SyncStatusBadge />
            <AuthControls />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <SyncNotice />
        {lastTrashed && <TrashUndoNotice event={lastTrashed} onDone={clearLastTrashed} />}
        {summaries === undefined && <p className="text-sm text-base-content/60">Loading events…</p>}
        {summaries?.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-box border border-dashed border-base-300 p-12 text-center">
            <p className="text-base font-medium">No events yet</p>
            <p className="max-w-md text-sm text-base-content/60">
              Create your first seating chart — start blank or from a template (reception, ceremony,
              gala…). Or open a sample wedding to see how everything works.
            </p>
            <div className="flex gap-2">
              <NewEventButton label="Create your first event" />
              <SampleEventButton />
            </div>
            <p className="text-xs text-base-content/70">
              Everything stays on this device. No account needed.
            </p>
          </div>
        )}
        {summaries !== undefined && summaries.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <EventCard key={summary.id} summary={summary} onTrashed={setLastTrashed} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
