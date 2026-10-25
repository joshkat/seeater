import { checkInCounts, layoutViews } from "@seating/shared";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";

import { UndoRedoButtons } from "../../editor/components/UndoRedoButtons";
import { SaveStatusBadge } from "../../editor/components/SaveStatusBadge";
import { useUnsavedChangesGuard } from "../../editor/hooks/useUnsavedChangesGuard";
import { useDocumentStore } from "../../editor/store/documentStore";
import { useRecentCheckIns } from "../hooks/useRecentCheckIns";
import { checkInAnnouncement } from "../lib/checkInAnnouncement";
import { checkInGuests, undoCheckIn } from "../lib/checkInActions";
import { type ArrivalFilter, type CheckInRow, checkInList } from "../lib/checkInList";
import { ArrivalFilterTabs } from "./ArrivalFilterTabs";
import { CheckInGuestRow } from "./CheckInGuestRow";
import { CheckInMenu } from "./CheckInMenu";
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
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const { recentIds, markRecent, forget } = useRecentCheckIns();
  const searchRef = useRef<HTMLInputElement>(null);

  const views = useMemo(() => layoutViews(doc), [doc]);
  const view = views.find((candidate) => candidate.id === layoutId) ?? views[0];
  const rows = useMemo(
    () => checkInList(doc, view, query, arrival, recentIds),
    [doc, view, query, arrival, recentIds],
  );
  const counts = useMemo(() => checkInCounts(doc), [doc]);
  const searchText = query.trim();

  function handleCheckIn(row: CheckInRow, guestIds: string[]): void {
    checkInGuests(guestIds);
    markRecent(guestIds);
    setAnnouncement(checkInAnnouncement(row, guestIds.length));
  }

  function handleUndo(guestId: string): void {
    undoCheckIn(guestId);
    forget(guestId);
  }

  function handleWalkInDone(added: { name: string; guestId: string | null } | null): void {
    setWalkIn(null);
    if (added) {
      setQuery(added.name);
      if (added.guestId) markRecent([added.guestId]);
      setAnnouncement(`${added.name} added and checked in`);
    }
    searchRef.current?.focus();
  }

  const walkInButton = (
    <button type="button" className="btn btn-sm" onClick={() => setWalkIn(searchText)}>
      Add “{searchText}” as a walk-in
    </button>
  );

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <header className="sticky top-0 z-10 border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link to={`/events/${doc.id}`} className="btn btn-secondary btn-sm">
              ← Editor
            </Link>
            {/* Phones: the title gets a line of its own, so it isn't cut to a few letters. */}
            <h1 className="min-w-0 flex-1 truncate text-lg font-semibold max-sm:order-first max-sm:basis-full">
              Check-in · {doc.name}
            </h1>
            <div className="max-sm:hidden">
              <SaveStatusBadge />
            </div>
            <div className="flex items-center gap-1 max-sm:ml-auto">
              <UndoRedoButtons labelUndo />
              <CheckInMenu arrived={counts.arrived} />
            </div>
          </div>
          <CheckInSummary counts={counts} announcement={announcement} />
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
              onClick={() => setWalkIn(searchText)}
            >
              + Walk-in
            </button>
          </div>
          {searchText && arrival !== "all" && (
            <p className="-mt-1 text-xs text-base-content/70">
              Searching everyone, arrived or not.
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4">
        {walkIn !== null && <WalkInForm initialName={walkIn} onDone={handleWalkInDone} />}
        {rows.length > 0 ? (
          <>
            <ul className="flex flex-col gap-2" aria-label="Guests">
              {rows.map((row) => (
                <CheckInGuestRow
                  key={row.guest.id}
                  row={row}
                  recent={recentIds.has(row.guest.id)}
                  onCheckIn={(guestIds) => handleCheckIn(row, guestIds)}
                  onUndo={handleUndo}
                />
              ))}
            </ul>
            {searchText && walkIn === null && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-base-content/70">
                <span>Not them?</span>
                {walkInButton}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-box border border-dashed border-base-300 p-6 text-center text-sm text-base-content/70">
            {searchText ? (
              <>
                <p>No one on the list matches “{searchText}”.</p>
                {walkIn === null && <div className="mt-3">{walkInButton}</div>}
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
      </main>
    </div>
  );
}
