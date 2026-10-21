import { layoutViews } from "@seating/shared";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useDocumentStore } from "../../editor/store/documentStore";
import { alphabetical, seatingRows, tableRosters } from "../lib/seatingRows";
import { PRINT_KINDS, type PrintKind, usePrintStore } from "../store/printStore";
import { ChartSheet } from "./print/ChartSheet";
import { EscortCards } from "./print/EscortCards";
import { FindYourSeatSheet } from "./print/FindYourSeatSheet";
import { PlaceCards } from "./print/PlaceCards";
import { RosterSheets } from "./print/RosterSheets";

/**
 * A printable document over the app. "Print / Save as PDF" uses the
 * browser's print dialog; while this is open the app itself is hidden from
 * printing (global.css: body.printing), so only the sheet comes out.
 */
export function PrintView(): JSX.Element | null {
  const kind = usePrintStore((state) => state.kind);
  const open = usePrintStore((state) => state.open);
  const close = usePrintStore((state) => state.close);
  const doc = useDocumentStore((state) => state.doc);
  const views = useMemo(() => (doc ? layoutViews(doc) : []), [doc]);
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [includeDeclined, setIncludeDeclined] = useState(false);
  const chartUrl = usePrintStore((state) => state.chartUrl);

  useEffect(() => {
    if (!kind) return;
    document.body.classList.add("printing");
    return () => document.body.classList.remove("printing");
  }, [kind]);

  if (!kind || !doc) return null;
  const active = views.find((view) => view.active)!;
  const view = kind === "chart" ? active : (views.find((v) => v.id === layoutId) ?? active);
  const rows = seatingRows(doc, view);
  const options = { includeDeclined };

  const sheet: Record<PrintKind, JSX.Element> = {
    chart: <ChartSheet imageUrl={chartUrl} title={doc.name} layoutName={active.name} />,
    rosters: <RosterSheets title={doc.name} rosters={tableRosters(rows, options)} />,
    "find-your-seat": <FindYourSeatSheet title={doc.name} rows={alphabetical(rows, options)} />,
    "place-cards": <PlaceCards rows={alphabetical(rows, options)} />,
    "escort-cards": <EscortCards rows={alphabetical(rows, options)} />,
  };

  return createPortal(
    <div
      id="print-view"
      role="dialog"
      aria-label="Print"
      className="fixed inset-0 z-[200] overflow-auto bg-white text-neutral-900"
    >
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-base-300 bg-base-100 p-3 text-base-content">
        <div role="tablist" className="tabs tabs-box tabs-sm">
          {PRINT_KINDS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={kind === option.value}
              className={`tab ${kind === option.value ? "tab-active" : ""}`}
              onClick={() => open(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {kind !== "chart" && views.length > 1 && (
          <select
            aria-label="Layout"
            className="select select-sm w-auto"
            value={view.id}
            onChange={(event) => setLayoutId(event.target.value)}
          >
            {views.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        )}
        {kind !== "chart" && (
          <label className="label cursor-pointer gap-1.5 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={includeDeclined}
              onChange={(event) => setIncludeDeclined(event.target.checked)}
            />
            Include declined guests
          </label>
        )}
        {kind === "chart" && views.length > 1 && (
          <span className="text-xs text-base-content/60">
            The chart shows the current layout. Switch layouts to print another.
          </span>
        )}
        <span className="flex-1" />
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <button type="button" className="btn btn-sm" onClick={close}>
          Close
        </button>
      </div>
      <div className="mx-auto max-w-[8.5in] p-8 print:max-w-none print:p-0">{sheet[kind]}</div>
    </div>,
    document.body,
  );
}
