import { type EventDoc, layoutViews } from "@seating/shared";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { ThemeMenu } from "../../../components/ThemeMenu";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { PrintDocument } from "../../export/components/PrintDocument";
import { chartScene } from "../../export/lib/chartScene";
import { defaultPrintLayoutId } from "../../export/lib/printLayout";
import { usePrintStore } from "../../export/store/printStore";
import { useChartViewport } from "../hooks/useChartViewport";
import { type SeatMatch, findSeats, tableArea } from "../lib/findSeat";
import type { ViewerImageSource } from "../lib/viewerImages";
import { FindSeatPanel } from "./FindSeatPanel";
import { ViewerChart } from "./ViewerChart";
import { ViewerLayoutTabs } from "./ViewerLayoutTabs";
import { ViewerPrintMenu } from "./ViewerPrintMenu";

export interface EventViewerProps {
  doc: EventDoc;
  /** Shown under the header, e.g. "Sam is editing" or "Shared with you by …". */
  banner?: ReactNode;
  /** Floor-plan pictures; without it (or without the image) there's no backdrop. */
  images?: ViewerImageSource;
  /** Left of the title, e.g. a link back to the editor. */
  nav?: ReactNode;
}

/**
 * A read-only view of an event: its seating chart (pan and zoom), layout
 * tabs, "Find your seat" and the print views. Purely presentational — it never
 * touches the document store, so it makes no saves and no undo history, and
 * any source (local storage, a share link, a locked event) can feed it.
 */
export function EventViewer({ doc, banner, images, nav }: EventViewerProps): JSX.Element {
  useDocumentTitle(`${doc.name} · Seating chart`);
  const views = useMemo(() => layoutViews(doc), [doc]);
  // Starts on the dinner (the layout with the most tables), like the printed board.
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const view =
    views.find((candidate) => candidate.id === layoutId) ??
    views.find((candidate) => candidate.id === defaultPrintLayoutId("find-your-seat", views)) ??
    views[0];
  const [showNames, setShowNames] = useState(true);
  const scene = useMemo(
    () => chartScene(doc, view, { showNames, color: "none", includeDeclined: false }),
    [doc, view, showNames],
  );
  const [query, setQuery] = useState("");
  const matches = useMemo(() => findSeats(doc, view, query), [doc, view, query]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = matches.find((match) => match.guest.id === pickedId) ?? null;

  const chartRef = useRef<HTMLDivElement>(null);
  const viewport = useChartViewport(chartRef, scene.bounds, view.id);

  // Print views are app-wide state: don't leave one open for the next page.
  useEffect(() => () => usePrintStore.getState().close(), []);

  function pick(match: SeatMatch): void {
    setPickedId(match.guest.id);
    const area = match.tableId ? tableArea(scene, view, match.tableId) : null;
    if (area) viewport.focus(area);
  }

  return (
    <div className="flex h-dvh flex-col bg-base-200 text-base-content">
      <header className="border-b border-base-300 bg-base-100">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          {nav}
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold max-sm:order-first max-sm:basis-full">
            {doc.name}
          </h1>
          <span className="badge badge-outline badge-sm">View only</span>
          <div className="flex items-center gap-1 max-sm:ml-auto">
            <label className="label cursor-pointer gap-1.5 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={showNames}
                onChange={(event) => setShowNames(event.target.checked)}
              />
              Names
            </label>
            <ViewerPrintMenu layoutId={view.id} />
            <ThemeMenu />
          </div>
        </div>
        {banner}
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <aside className="flex shrink-0 flex-col rounded-box border border-base-300 bg-base-100 p-3 lg:w-80">
          <FindSeatPanel
            query={query}
            onQueryChange={setQuery}
            matches={matches}
            pickedId={picked?.guest.id ?? null}
            onPick={pick}
          />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          {views.length > 1 && (
            <ViewerLayoutTabs views={views} value={view.id} onChange={setLayoutId} />
          )}
          <ViewerChart
            scene={scene}
            view={view}
            viewport={viewport}
            containerRef={chartRef}
            picked={picked}
            images={images}
          />
        </div>
      </main>
      <PrintDocument doc={doc} />
    </div>
  );
}
