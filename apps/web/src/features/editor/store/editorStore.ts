import type {
  ChairLayoutMode,
  EventDoc,
  ExactSeatPlacement,
  Point,
  TableShape,
} from "@seating/shared";
import {
  DEFAULT_FLOOR_PLAN_SIZE,
  addTable,
  deleteTables,
  duplicateTables,
  renameEventDoc,
  setChairMode,
  setExactSeatPlacement,
  setSeatCount,
  setSeatOffset,
  setTableLabel,
  type TableTransform,
  updateTableTransform,
} from "@seating/shared";
import { create } from "zustand";

import {
  type StageSize,
  fitViewport,
  focusViewportForTable,
  zoomViewportAtCenter,
} from "../geometry/viewport";
import type { Viewport } from "../types";
import { useDocumentStore } from "./documentStore";

/**
 * Editor view state (viewport, zoom/focus, selection) plus table actions.
 *
 * The tables themselves live in the open document (documentStore); actions
 * here apply pure ops from @seating/shared to it, which also persists them.
 */
interface EditorState {
  selectedIds: string[];
  viewport: Viewport;
  stageSize: StageSize;
  /** The fit-to-view baseline, set once the plan loads. */
  homeViewport: Viewport | null;
  /** Viewport to restore to when leaving a focused table. */
  preFocusViewport: Viewport | null;
  /** The table currently zoomed in on, if any. */
  focusedTableId: string | null;

  /** Clears per-event view state; called when a different event is opened. */
  resetForNewEvent: () => void;
  renameEvent: (name: string) => void;
  setExactSeatPlacement: (mode: ExactSeatPlacement) => void;
  setViewport: (viewport: Viewport) => void;
  setStageSize: (size: StageSize) => void;
  fitToView: () => void;
  focusTable: (id: string) => void;
  clearFocus: () => void;
  zoomBy: (factor: number) => void;
  resetView: () => void;

  selectTable: (id: string | null, additive?: boolean) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;

  addTable: (shape: TableShape) => void;
  updateTableTransform: (id: string, transform: TableTransform) => void;
  setTableLabel: (id: string, label: string) => void;
  setSeatCount: (id: string, seatCount: number) => void;
  setChairMode: (id: string, mode: ChairLayoutMode) => void;
  setSeatOffset: (id: string, seatIndex: number, offset: Point) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
}

function currentDoc(): EventDoc | null {
  return useDocumentStore.getState().doc;
}

function edit(change: (doc: EventDoc) => EventDoc, coalesceKey?: string): void {
  useDocumentStore.getState().apply(change, { coalesceKey });
}

function dimensions() {
  return currentDoc()?.dimensions ?? DEFAULT_FLOOR_PLAN_SIZE;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedIds: [],
  viewport: { x: 0, y: 0, scale: 1 },
  stageSize: { width: 0, height: 0 },
  homeViewport: null,
  preFocusViewport: null,
  focusedTableId: null,

  resetForNewEvent() {
    set({ selectedIds: [], focusedTableId: null, preFocusViewport: null, homeViewport: null });
  },

  renameEvent(name) {
    edit((doc) => renameEventDoc(doc, name));
  },

  setExactSeatPlacement(mode) {
    edit((doc) => setExactSeatPlacement(doc, mode));
  },

  setViewport(viewport) {
    set({ viewport });
  },

  setStageSize(size) {
    set({ stageSize: size });
  },

  fitToView() {
    const { stageSize } = get();
    if (!stageSize.width || !stageSize.height) return;
    const viewport = fitViewport(dimensions(), stageSize);
    set({ viewport, homeViewport: viewport });
  },

  focusTable(id) {
    const { stageSize, viewport, focusedTableId, preFocusViewport } = get();
    if (!stageSize.width || !stageSize.height) return;
    const table = currentDoc()?.tables.find((t) => t.id === id);
    if (!table) return;
    set({
      focusedTableId: id,
      // Remember where we were only when entering focus from an unfocused view.
      preFocusViewport: focusedTableId === null ? viewport : preFocusViewport,
      viewport: focusViewportForTable(table, stageSize),
    });
  },

  clearFocus() {
    const { focusedTableId, preFocusViewport, stageSize } = get();
    if (focusedTableId === null) return;
    // Use the saved pre-focus viewport if there is one; otherwise re-fit.
    const restored =
      preFocusViewport ?? (stageSize.width ? fitViewport(dimensions(), stageSize) : undefined);
    set({
      focusedTableId: null,
      viewport: restored ?? get().viewport,
      preFocusViewport: null,
    });
  },

  zoomBy(factor) {
    const { viewport, stageSize } = get();
    if (!stageSize.width) return;
    set({ viewport: zoomViewportAtCenter(viewport, stageSize, factor) });
  },

  resetView() {
    // Always recompute fit-to-view from the *current* stage size so the
    // result is correct after any window resize, rather than restoring a
    // stale snapshot.
    const { stageSize } = get();
    const viewport =
      stageSize.width && stageSize.height
        ? fitViewport(dimensions(), stageSize)
        : (get().homeViewport ?? get().viewport);
    set({
      viewport,
      homeViewport: viewport,
      focusedTableId: null,
      preFocusViewport: null,
      selectedIds: [],
    });
  },

  selectTable(id, additive = false) {
    if (id === null) {
      set({ selectedIds: [] });
      return;
    }
    set((state) => {
      if (!additive) return { selectedIds: [id] };
      return state.selectedIds.includes(id)
        ? { selectedIds: state.selectedIds.filter((existing) => existing !== id) }
        : { selectedIds: [...state.selectedIds, id] };
    });
  },

  setSelection(ids) {
    set({ selectedIds: ids });
  },

  clearSelection() {
    set({ selectedIds: [] });
  },

  addTable(shape) {
    const doc = currentDoc();
    if (!doc) return;
    const jitter = (doc.tables.length % 5) * 24;
    const { width, height } = doc.dimensions;
    const result = addTable(doc, {
      shape,
      position: { x: width / 2 + jitter, y: height / 2 + jitter },
    });
    edit(() => result.doc);
    set({ selectedIds: [result.tableId] });
  },

  updateTableTransform(id, transform) {
    edit((doc) => updateTableTransform(doc, id, transform));
  },

  setTableLabel(id, label) {
    // Typed one keystroke at a time: one undo step per burst of typing.
    edit((doc) => setTableLabel(doc, id, label), `table-label:${id}`);
  },

  setSeatCount(id, seatCount) {
    edit((doc) => setSeatCount(doc, id, seatCount));
  },

  setChairMode(id, mode) {
    edit((doc) => setChairMode(doc, id, mode));
  },

  setSeatOffset(id, seatIndex, offset) {
    edit((doc) => setSeatOffset(doc, id, seatIndex, offset));
  },

  duplicateSelected() {
    const doc = currentDoc();
    const { selectedIds } = get();
    if (!doc || selectedIds.length === 0) return;
    const result = duplicateTables(doc, selectedIds);
    edit(() => result.doc);
    set({ selectedIds: result.tableIds });
  },

  deleteSelected() {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    edit((doc) => deleteTables(doc, selectedIds));
    set({ selectedIds: [] });
  },
}));
