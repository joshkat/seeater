import type {
  AlignEdge,
  ChairLayoutMode,
  EventDoc,
  ExactSeatPlacement,
  Point,
  Size,
  TableGridOptions,
  TablePreset,
  TableShape,
  UnitSystem,
} from "@seating/shared";
import {
  DEFAULT_FLOOR_PLAN_SIZE,
  addTable,
  copyItems,
  moveItems,
  pasteItems,
  type RoomObjectKind,
  type RoomObjectPatch,
  addRoomObject,
  addTableFromPreset,
  addTableGrid,
  deleteRoomObjects,
  duplicateRoomObjects,
  updateRoomObject,
  alignTables,
  deleteTables,
  distributeTables,
  setFloorSize,
  setUnitSystem,
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
import { useClipboardStore } from "./clipboardStore";
import { useDocumentStore } from "./documentStore";

/**
 * Editor view state (viewport, zoom/focus, selection) plus table actions.
 *
 * The tables themselves live in the open document (documentStore); actions
 * here apply pure ops from @seating/shared to it, which also persists them.
 */
interface EditorState {
  selectedIds: string[];
  /** "Select several" (Select ▾): a click or tap toggles an item in or out of
   * the selection, and a drag on empty floor draws a marquee — the visible
   * equivalent of Shift-click / Shift-drag. */
  selectSeveral: boolean;
  viewport: Viewport;
  stageSize: StageSize;
  /** The fit-to-view baseline, set once the plan loads. */
  homeViewport: Viewport | null;
  /** Viewport to restore to when leaving a focused table. */
  preFocusViewport: Viewport | null;
  /** The table currently zoomed in on, if any. */
  focusedTableId: string | null;
  /** A chair briefly ringed by "Show on map" (cleared after a moment). */
  highlightedSeatId: string | null;
  /** Zooms to the table holding this seat and rings the chair. */
  locateSeat: (seatId: string) => void;

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
  setSelectSeveral: (on: boolean) => void;

  addTable: (shape: TableShape) => void;
  /** Adds a table from a preset near the middle of the floor, selected. */
  addPresetTable: (preset: TablePreset) => void;
  /** Adds a grid of tables centred on the floor, all selected. */
  addTableGrid: (options: Omit<TableGridOptions, "center">) => void;
  alignSelected: (edge: AlignEdge) => void;
  distributeSelected: (axis: "horizontal" | "vertical") => void;
  setUnits: (units: UnitSystem) => void;
  /** Adds a room object (dance floor, wall…) near the middle, selected. */
  addRoomObject: (kind: RoomObjectKind) => void;
  updateRoomObject: (id: string, patch: RoomObjectPatch) => void;
  setFloorSize: (size: Size) => void;
  updateTableTransform: (id: string, transform: TableTransform) => void;
  setTableLabel: (id: string, label: string) => void;
  setSeatCount: (id: string, seatCount: number) => void;
  setChairMode: (id: string, mode: ChairLayoutMode) => void;
  setSeatOffset: (id: string, seatIndex: number, offset: Point) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  /** Moves the selected tables and objects (arrow keys); a burst is one undo step. */
  nudgeSelected: (dx: number, dy: number) => void;
  /** Selects every table and room object in the layout. */
  selectAll: () => void;
  copySelected: () => void;
  /** Pastes the clipboard into the current layout, selecting the copies. */
  paste: () => void;
}

function currentDoc(): EventDoc | null {
  return useDocumentStore.getState().doc;
}

function edit(change: (doc: EventDoc) => EventDoc, coalesceKey?: string): void {
  useDocumentStore.getState().apply(change, { coalesceKey });
}

/** How long "Show on map" rings the chair. */
const HIGHLIGHT_MS = 2500;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

function dimensions() {
  return currentDoc()?.dimensions ?? DEFAULT_FLOOR_PLAN_SIZE;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedIds: [],
  selectSeveral: false,
  viewport: { x: 0, y: 0, scale: 1 },
  stageSize: { width: 0, height: 0 },
  homeViewport: null,
  preFocusViewport: null,
  focusedTableId: null,
  highlightedSeatId: null,

  locateSeat(seatId) {
    const table = currentDoc()?.tables.find((t) => t.seats.some((seat) => seat.id === seatId));
    if (!table) return;
    // Selecting a single table zooms to it (EditorCanvas).
    set({ selectedIds: [table.id], highlightedSeatId: seatId });
    clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => set({ highlightedSeatId: null }), HIGHLIGHT_MS);
  },

  resetForNewEvent() {
    set({
      selectedIds: [],
      selectSeveral: false,
      focusedTableId: null,
      preFocusViewport: null,
      homeViewport: null,
    });
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
      if (!additive && !state.selectSeveral) return { selectedIds: [id] };
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

  setSelectSeveral(on) {
    set({ selectSeveral: on });
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

  addPresetTable(preset) {
    const doc = currentDoc();
    if (!doc) return;
    const jitter = (doc.tables.length % 5) * 24;
    const result = addTableFromPreset(doc, preset, {
      x: doc.dimensions.width / 2 + jitter,
      y: doc.dimensions.height / 2 + jitter,
    });
    edit(() => result.doc);
    set({ selectedIds: [result.tableId] });
  },

  addTableGrid(options) {
    const doc = currentDoc();
    if (!doc) return;
    const center = { x: doc.dimensions.width / 2, y: doc.dimensions.height / 2 };
    const result = addTableGrid(doc, { ...options, center });
    edit(() => result.doc);
    set({ selectedIds: result.tableIds });
  },

  alignSelected(edge) {
    edit((doc) => alignTables(doc, get().selectedIds, edge));
  },

  distributeSelected(axis) {
    edit((doc) => distributeTables(doc, get().selectedIds, axis));
  },

  setUnits(units) {
    edit((doc) => setUnitSystem(doc, units));
  },

  setFloorSize(size) {
    edit((doc) => setFloorSize(doc, size));
    get().fitToView();
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

  // Selection holds table and room-object ids; each op ignores the other kind.
  duplicateSelected() {
    const doc = currentDoc();
    const { selectedIds } = get();
    if (!doc || selectedIds.length === 0) return;
    const tables = duplicateTables(doc, selectedIds);
    const objects = duplicateRoomObjects(tables.doc, selectedIds);
    edit(() => objects.doc);
    set({ selectedIds: [...tables.tableIds, ...objects.objectIds] });
  },

  deleteSelected() {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    edit((doc) => deleteRoomObjects(deleteTables(doc, selectedIds), selectedIds));
    set({ selectedIds: [] });
  },

  nudgeSelected(dx, dy) {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    edit((doc) => moveItems(doc, selectedIds, { x: dx, y: dy }), `nudge:${selectedIds.join()}`);
  },

  selectAll() {
    const doc = currentDoc();
    if (!doc) return;
    set({ selectedIds: [...doc.tables, ...doc.objects].map((item) => item.id) });
  },

  copySelected() {
    const doc = currentDoc();
    const { selectedIds } = get();
    if (!doc || selectedIds.length === 0) return;
    useClipboardStore.getState().set(copyItems(doc, selectedIds));
  },

  paste() {
    const doc = currentDoc();
    const items = useClipboardStore.getState().items;
    if (!doc || !items) return;
    const result = pasteItems(doc, items);
    if (result.ids.length === 0) return;
    edit(() => result.doc);
    set({ selectedIds: result.ids });
  },

  addRoomObject(kind) {
    const doc = currentDoc();
    if (!doc) return;
    const jitter = (doc.objects.length % 5) * 24;
    const result = addRoomObject(doc, kind, {
      x: doc.dimensions.width / 2 + jitter,
      y: doc.dimensions.height / 2 + jitter,
    });
    if (!result.objectId) return;
    edit(() => result.doc);
    set({ selectedIds: [result.objectId] });
  },

  updateRoomObject(id, patch) {
    // Label typing arrives per keystroke: one undo step per burst.
    edit(
      (doc) => updateRoomObject(doc, id, patch),
      patch.label !== undefined ? `object-label:${id}` : undefined,
    );
  },
}));
