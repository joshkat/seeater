import { layoutStats, layoutViews } from "@seating/shared";
import { useEffect, useMemo, useState } from "react";

import { useDocumentStore } from "../../editor/store/documentStore";
import { catererText } from "../lib/catererText";
import { StatTile } from "./StatTile";
import { TableStatsRow } from "./TableStatsRow";

/** Live numbers for any layout: who's seated, table fill, meal totals for caterers. */
export function StatsDialog({ onClose }: { onClose: () => void }): JSX.Element | null {
  const doc = useDocumentStore((state) => state.doc);
  const views = useMemo(() => (doc ? layoutViews(doc) : []), [doc]);
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const view = views.find((candidate) => candidate.id === layoutId) ?? views.find((v) => v.active);
  const stats = useMemo(() => (doc && view ? layoutStats(doc, view) : null), [doc, view]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!doc || !stats) return null;
  const { seated } = stats;

  async function copyForCaterer(): Promise<void> {
    if (!doc || !stats) return;
    await navigator.clipboard.writeText(catererText(doc.name, stats));
    setCopied(true);
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Stats">
      <div className="modal-box flex max-h-[90vh] w-full max-w-4xl flex-col gap-4 text-base-content">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">Stats</h2>
          <button
            type="button"
            aria-label="Close"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {views.length > 1 && (
          <div role="tablist" className="tabs-box tabs tabs-sm self-start">
            {views.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                aria-selected={candidate.id === view?.id}
                className={`tab ${candidate.id === view?.id ? "tab-active" : ""}`}
                onClick={() => setLayoutId(candidate.id)}
              >
                {candidate.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label={`of ${seated.total} guests seated`} value={seated.seated} />
          <StatTile
            label="still need a seat"
            value={seated.needSeat}
            tone={seated.needSeat > 0 ? "text-warning" : "text-success"}
          />
          <StatTile label="going · pending" value={`${seated.going} · ${seated.pending}`} />
          <StatTile label="declined" value={seated.declined} />
          <StatTile label="chairs" value={stats.chairs} />
          <StatTile label="empty chairs" value={Math.max(0, stats.chairs - seated.seated)} />
          <StatTile label="children" value={seated.children} />
          <StatTile label="tables" value={stats.tables.length} />
        </div>

        <section>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Meals (seated, not declined)</h3>
            <button type="button" className="btn btn-sm" onClick={() => void copyForCaterer()}>
              {copied ? "Copied ✓" : "Copy for caterer"}
            </button>
          </div>
          <p className="text-sm">
            {stats.meals.length === 0
              ? "No meals yet. Add them in each guest’s details (✎)."
              : stats.meals.map(([meal, count]) => `${meal} ${count}`).join(" · ")}
          </p>
        </section>

        <div className="min-h-0 overflow-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Table</th>
                <th>Seated</th>
                <th>Meals</th>
                <th>Children</th>
                <th>Dietary &amp; accessibility</th>
              </tr>
            </thead>
            <tbody>
              {stats.tables.map((table) => (
                <TableStatsRow key={table.tableId} table={table} />
              ))}
            </tbody>
          </table>
          {stats.tables.length === 0 && (
            <p className="p-4 text-center text-sm text-base-content/60">
              No tables in this layout yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
