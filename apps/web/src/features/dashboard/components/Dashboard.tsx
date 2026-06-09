import type { FloorPlanSummary } from "@seating/shared";
import { useCallback, useEffect, useState } from "react";

import { AuthControls } from "../../auth/components/AuthControls";
import { listFloorPlanSummaries } from "../../editor/api/floorPlanApi";
import { EventCard } from "./EventCard";
import { NewEventButton } from "./NewEventButton";

type Status = "loading" | "ready" | "error";

/** The "My Events" landing page: every seating chart as a tile. */
export function Dashboard(): JSX.Element {
  const [summaries, setSummaries] = useState<FloorPlanSummary[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const list = await listFloorPlanSummaries();
      setSummaries(list);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">My Events</h1>
          <div className="flex items-center gap-3">
            <NewEventButton />
            <AuthControls />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {status === "loading" && <p className="text-sm text-base-content/60">Loading events…</p>}
        {status === "error" && (
          <p className="text-sm text-error">Could not load events. Is the API running?</p>
        )}
        {status === "ready" && summaries.length === 0 && (
          <div className="rounded-box border border-dashed border-base-300 p-12 text-center">
            <p className="text-base font-medium">No events yet</p>
            <p className="mt-1 text-sm text-base-content/60">
              Create your first seating chart to get started.
            </p>
          </div>
        )}
        {status === "ready" && summaries.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <EventCard key={summary.id} summary={summary} onChanged={() => void refresh()} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
