import { create } from "zustand";

import type { DragPayload, Point } from "../lib/dragTypes";

/** The drag in progress (for the ghost and hover highlights), or null. */
interface DragState {
  drag: { payload: DragPayload; point: Point; pointerType: string } | null;
  start: (payload: DragPayload, point: Point, pointerType: string) => void;
  move: (point: Point) => void;
  end: () => void;
}

export const useDragStore = create<DragState>((set) => ({
  drag: null,
  start(payload, point, pointerType) {
    set({ drag: { payload, point, pointerType } });
  },
  move(point) {
    set((state) => (state.drag ? { drag: { ...state.drag, point } } : state));
  },
  end() {
    set({ drag: null });
  },
}));
