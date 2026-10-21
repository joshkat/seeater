import { create } from "zustand";

import { captureChart } from "../lib/chartCapture";

/** The printable documents. */
export type PrintKind = "chart" | "rosters" | "find-your-seat" | "place-cards" | "escort-cards";

export const PRINT_KINDS: { value: PrintKind; label: string }[] = [
  { value: "chart", label: "Seating chart" },
  { value: "rosters", label: "Table rosters" },
  { value: "find-your-seat", label: "Find your seat" },
  { value: "place-cards", label: "Place cards" },
  { value: "escort-cards", label: "Escort cards" },
];

/** Which printable document is open (null = none). */
interface PrintState {
  kind: PrintKind | null;
  /** The chart image, captured from the canvas when the chart is opened. */
  chartUrl: string | null;
  open: (kind: PrintKind) => void;
  close: () => void;
}

export const usePrintStore = create<PrintState>((set) => ({
  kind: null,
  chartUrl: null,
  open(kind) {
    // The chart is the canvas as it is right now (the active layout).
    set(kind === "chart" ? { kind, chartUrl: captureChart() } : { kind });
  },
  close() {
    set({ kind: null, chartUrl: null });
  },
}));
