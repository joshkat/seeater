import { checkInCounts, layoutViews } from "@seating/shared";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";

import { UndoRedoButtons } from "../../editor/components/UndoRedoButtons";
import { SaveStatusBadge } from "../../editor/components/SaveStatusBadge";
import { useUnsavedChangesGuard } from "../../editor/hooks/useUnsavedChangesGuard";
import { useDocumentStore } from "../../editor/store/documentStore";
import { resetCheckIns } from "../lib/checkInActions";
import { type ArrivalFilter, checkInList } from "../lib/checkInList";
import { ArrivalFilterTabs } from "./ArrivalFilterTabs";
import { CheckInGuestRow } from "./CheckInGuestRow";
import { CheckInSummary } from "./CheckInSummary";
import { WalkInForm } from "./WalkInForm";

/** Day-of check-in for the open event: find a guest, tell them their table, mark them arrived. */
export function CheckInPage(): JSX.Element {
  useUnsavedChangesGuard();
  const doc = useDocumentStore((state) => state.doc)!;
  const [query, setQuery] = useState("");
  const [arrival, setArrival] = useState<ArrivalFilter>("waiting");
  const [layoutId, setLayoutId] = useState(doc.activeLayoutId);
  const [walkIn, setWalkIn] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const views = useMemo(() => layoutViews(doc), [doc]);
  const view = views.find((candidate) => candidate.id === layoutId) ?? views[0];
  const rows = useMemo(() => checkInList(doc, view, query, arrival), [doc, view, query, arrival]);
  const counts = useMemo(() => checkInCounts(doc), [doc]);

  function handleWalkInDone(name: string | null): void {
    setWalkIn(null);
    if (name) {
      setQuery(name);
      setArrival("all");
    }
    searchRef.current?.focus();
  }

  function handleClearAll(): void {
    if (window.confirm("Clear every check-in for this event? (You can undo this.)")) {
      resetCheckIns();
    }
  }

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <header className="sticky top-0 z-10 border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={`/events/${doc.id}`} className="btn btn-secondary btn-sm">
              ← Editor
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">Check-in · {doc.name}</h1>
            <div className="max-sm:hidden">
              <SaveStatusBadge />
            </div>
            <UndoRedoButtons />
          </div>
          <CheckInSummary counts={counts} />
          <input
            ref={searchRef}
            type="search"
            autoFocus
            aria-label="Find a guest"
            placeholder="Find a guest by name, household or tag…"
            className="input input-bordered w-full"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={(event) => event.target.select()}
          />
          <div className="flex flex-wrap items-center gap-2">
            <ArrivalFilterTabs value={arrival} onChange={setArrival} />
            {views.length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                Seats from
                <select
                  className="select select-bordered select-sm"
                  value={view.id}
                  onChange={(event) => setLayoutId(event.target.value)}
                >
                  {views.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm ml-auto"
              onClick={() => setWalkIn(query.trim())}
            >
              + Walk-in
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4">
        {walkIn !== null && <WalkInForm initialName={walkIn} onDone={handleWalkInDone} />}
        {rows.length > 0 ? (
          <ul className="flex flex-col gap-2" aria-label="Guests">
            {rows.map((row) => (
              <CheckInGuestRow key={row.guest.id} row={row} />
            ))}
          </ul>
        ) : (
          <div className="rounded-box border border-dashed border-base-300 p-6 text-center text-sm text-base-content/70">
            {query.trim() ? (
              <>
                <p>No one matches “{query.trim()}”.</p>
                <button
                  type="button"
                  className="btn btn-sm mt-3"
                  onClick={() => setWalkIn(query.trim())}
                >
                  Add “{query.trim()}” as a walk-in
                </button>
              </>
            ) : arrival === "waiting" && counts.arrived > 0 ? (
              <p>Everyone expected has arrived.</p>
            ) : arrival === "arrived" ? (
              <p>No one has checked in yet.</p>
            ) : (
              <p>There are no guests on the list yet.</p>
            )}
          </div>
        )}
        {counts.arrived > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm mt-4 self-center text-error"
            onClick={handleClearAll}
          >
            Clear all check-ins
          </button>
        )}
      </main>
    </div>
  );
}
