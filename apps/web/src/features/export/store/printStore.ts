import { create } from "zustand";

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
  /** A layout picked in the print view (null = each kind's default). */
  layoutId: string | null;
  /** Opens a print view; `layoutId` starts every kind on that layout. */
  open: (kind: PrintKind, layoutId?: string) => void;
  setLayoutId: (layoutId: string) => void;
  close: () => void;
}

export const usePrintStore = create<PrintState>((set) => ({
  kind: null,
  layoutId: null,
  open(kind, layoutId) {
    set(layoutId === undefined ? { kind } : { kind, layoutId });
  },
  setLayoutId(layoutId) {
    set({ layoutId });
  },
  close() {
    set({ kind: null, layoutId: null });
  },
}));
