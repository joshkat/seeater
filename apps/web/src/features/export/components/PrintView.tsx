import { layoutViews } from "@seating/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useModalFocus } from "../../../lib/useModalFocus";
import { useDocumentStore } from "../../editor/store/documentStore";
import { CHART_COLOR_MODES, type ChartColorMode, chartScene } from "../lib/chartScene";
import { defaultPrintLayoutId } from "../lib/printLayout";
import { alphabetical, seatingRows, tableRosters } from "../lib/seatingRows";
import { PRINT_KINDS, type PrintKind, usePrintStore } from "../store/printStore";
import { ChartPrintOptions } from "./print/ChartPrintOptions";
import { ChartSheet } from "./print/ChartSheet";
import { EscortCards } from "./print/EscortCards";
import { FindYourSeatSheet } from "./print/FindYourSeatSheet";
import { PlaceCards } from "./print/PlaceCards";
import { PrintLayoutPicker } from "./print/PrintLayoutPicker";
import { RosterSheets } from "./print/RosterSheets";

/**
 * A printable document over the app. "Print / Save as PDF" uses the
 * browser's print dialog; while this is open the app itself is hidden from
 * printing (global.css: body.printing), so only the sheet comes out.
 */
export function PrintView(): JSX.Element | null {
  const boxRef = useRef<HTMLDivElement>(null);
  const kind = usePrintStore((state) => state.kind);
  const open = usePrintStore((state) => state.open);
  const close = usePrintStore((state) => state.close);
  useModalFocus(boxRef, kind !== null);
  const doc = useDocumentStore((state) => state.doc);
  const views = useMemo(() => (doc ? layoutViews(doc) : []), [doc]);
  const layoutId = usePrintStore((state) => state.layoutId);
  const setLayoutId = usePrintStore((state) => state.setLayoutId);
  const [includeDeclined, setIncludeDeclined] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [color, setColor] = useState<ChartColorMode>("none");

  useEffect(() => {
    if (!kind) return;
    document.body.classList.add("printing");
    return () => document.body.classList.remove("printing");
  }, [kind]);

  if (!kind || !doc) return null;
  // A layout picked here applies to every print kind until the view closes;
  // until then each kind starts on its own default (see defaultPrintLayoutId).
  const view =
    views.find((candidate) => candidate.id === (layoutId ?? defaultPrintLayoutId(kind, views))) ??
    views.find((candidate) => candidate.active)!;
  const rows = seatingRows(doc, view);
  const options = { includeDeclined };
  const colorLabel =
    color === "none"
      ? null
      : (CHART_COLOR_MODES.find((mode) => mode.value === color)?.label ?? null);

  const sheet: Record<PrintKind, JSX.Element> = {
    chart: (
      <ChartSheet
        scene={chartScene(doc, view, { showNames, color, includeDeclined })}
        title={doc.name}
        layoutName={view.name}
        colorLabel={colorLabel}
      />
    ),
    rosters: <RosterSheets title={doc.name} rosters={tableRosters(rows, options)} />,
    "find-your-seat": <FindYourSeatSheet title={doc.name} rows={alphabetical(rows, options)} />,
    "place-cards": <PlaceCards rows={alphabetical(rows, options)} />,
    "escort-cards": <EscortCards rows={alphabetical(rows, options)} />,
  };

  return createPortal(
    <div
      id="print-view"
      ref={boxRef}
      aria-modal="true"
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
        {views.length > 1 && (
          <PrintLayoutPicker views={views} value={view.id} onChange={setLayoutId} />
        )}
        <label className="label cursor-pointer gap-1.5 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={includeDeclined}
            onChange={(event) => setIncludeDeclined(event.target.checked)}
          />
          Include declined guests
        </label>
        {kind === "chart" && (
          <ChartPrintOptions
            showNames={showNames}
            onShowNamesChange={setShowNames}
            color={color}
            onColorChange={setColor}
          />
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
