import type {
  ChairLayoutMode,
  Point,
  Seat,
  Size,
  Table,
  TableInput,
  TableShape,
} from "@seating/shared";
import {
  DEFAULT_FLOOR_PLAN_SIZE,
  DEFAULT_SEAT_COUNT,
  computeAutoSeatOffsets,
  defaultSizeForShape,
} from "@seating/shared";
import { create } from "zustand";

import {
  createTable,
  deleteTable,
  getFloorPlan,
  updateFloorPlan,
  updateTable,
} from "../api/floorPlanApi";
import {
  type StageSize,
  fitViewport,
  focusViewportForTable,
  zoomViewportAtCenter,
} from "../geometry/viewport";
import type { SaveStatus, Viewport } from "../types";
import { schedulePersist } from "./persistQueue";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface EditorState {
  floorPlanId: string | null;
  name: string;
  dimensions: Size;
  tables: Table[];
  selectedIds: string[];
  viewport: Viewport;
  stageSize: StageSize;
  /** The fit-to-view baseline, set once the plan loads. */
  homeViewport: Viewport | null;
  /** Viewport to restore to when leaving a focused table. */
  preFocusViewport: Viewport | null;
  /** The table currently zoomed in on, if any. */
  focusedTableId: string | null;
  loadStatus: LoadStatus;
  saveStatus: SaveStatus;

  loadFloorPlan: (id: string) => Promise<void>;
  renameFloorPlan: (name: string) => Promise<void>;
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

  addTable: (shape: TableShape) => Promise<void>;
  updateTableTransform: (
    id: string,
    patch: { position?: Point; size?: Size; rotation?: number },
  ) => void;
  setTableLabel: (id: string, label: string) => void;
  setSeatCount: (id: string, seatCount: number) => void;
  setChairMode: (id: string, mode: ChairLayoutMode) => void;
  setSeatOffset: (id: string, seatIndex: number, offset: Point) => void;
  duplicateSelected: () => Promise<void>;
  deleteSelected: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => {
  /** Updates a single table in place via an updater function. */
  const patchTable = (id: string, updater: (table: Table) => Table): void => {
    set((state) => ({
      tables: state.tables.map((table) => (table.id === id ? updater(table) : table)),
    }));
  };

  /** Schedules a debounced PATCH for a table and reflects save status. */
  const persist = (id: string, patch: Partial<TableInput>): void => {
    const floorPlanId = get().floorPlanId;
    if (!floorPlanId) return;

    schedulePersist(id, patch, {
      persist: (tableId, body) => updateTable(floorPlanId, tableId, body),
      onStart: () => set({ saveStatus: "saving" }),
      onResult: (tableId, table) => {
        patchTable(tableId, () => table);
        set({ saveStatus: "saved" });
      },
      onError: () => set({ saveStatus: "error" }),
    });
  };

  return {
    floorPlanId: null,
    name: "",
    dimensions: DEFAULT_FLOOR_PLAN_SIZE,
    tables: [],
    selectedIds: [],
    viewport: { x: 0, y: 0, scale: 1 },
    stageSize: { width: 0, height: 0 },
    homeViewport: null,
    preFocusViewport: null,
    focusedTableId: null,
    loadStatus: "idle",
    saveStatus: "idle",

    async loadFloorPlan(id) {
      set({
        loadStatus: "loading",
        // Reset per-plan view/selection so the new plan opens clean and re-fits.
        selectedIds: [],
        focusedTableId: null,
        preFocusViewport: null,
        homeViewport: null,
      });
      try {
        const plan = await getFloorPlan(id);
        set({
          floorPlanId: plan.id,
          name: plan.name,
          dimensions: plan.dimensions,
          tables: plan.tables,
          loadStatus: "ready",
        });
      } catch {
        set({ loadStatus: "error" });
      }
    },

    async renameFloorPlan(name) {
      const { floorPlanId, name: previous } = get();
      if (!floorPlanId) return;
      const trimmed = name.trim();
      if (!trimmed || trimmed === previous) return;
      set({ name: trimmed }); // optimistic
      try {
        await updateFloorPlan(floorPlanId, { name: trimmed });
      } catch {
        set({ name: previous });
      }
    },

    setViewport(viewport) {
      set({ viewport });
    },

    setStageSize(size) {
      set({ stageSize: size });
    },

    fitToView() {
      const { stageSize, dimensions } = get();
      if (!stageSize.width || !stageSize.height) return;
      const viewport = fitViewport(dimensions, stageSize);
      set({ viewport, homeViewport: viewport });
    },

    focusTable(id) {
      const { tables, stageSize, viewport, focusedTableId, preFocusViewport } = get();
      if (!stageSize.width || !stageSize.height) return;
      const table = tables.find((t) => t.id === id);
      if (!table) return;
      set({
        focusedTableId: id,
        // Remember where we were only when entering focus from an unfocused view.
        preFocusViewport: focusedTableId === null ? viewport : preFocusViewport,
        viewport: focusViewportForTable(table, stageSize),
      });
    },

    clearFocus() {
      const { focusedTableId, preFocusViewport, stageSize, dimensions } = get();
      if (focusedTableId === null) return;
      // Use the saved pre-focus viewport if it's still valid for the current
      // stage size; otherwise fall back to a fresh fit-to-view.
      const restored =
        preFocusViewport ?? (stageSize.width ? fitViewport(dimensions, stageSize) : undefined);
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
      const { stageSize, dimensions } = get();
      const viewport =
        stageSize.width && stageSize.height
          ? fitViewport(dimensions, stageSize)
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

    async addTable(shape) {
      const { floorPlanId, dimensions, tables } = get();
      if (!floorPlanId) return;

      const jitter = (tables.length % 5) * 24;
      const input: TableInput = {
        shape,
        position: { x: dimensions.width / 2 + jitter, y: dimensions.height / 2 + jitter },
        size: defaultSizeForShape(shape),
        chairLayoutMode: "auto",
        seatCount: DEFAULT_SEAT_COUNT,
      };

      try {
        const table = await createTable(floorPlanId, input);
        set((state) => ({ tables: [...state.tables, table], selectedIds: [table.id] }));
      } catch {
        set({ saveStatus: "error" });
      }
    },

    updateTableTransform(id, patch) {
      patchTable(id, (table) => ({
        ...table,
        position: patch.position ?? table.position,
        size: patch.size ?? table.size,
        rotation: patch.rotation ?? table.rotation,
      }));
      persist(id, patch);
    },

    setTableLabel(id, label) {
      patchTable(id, (table) => ({ ...table, label }));
      persist(id, { label });
    },

    setSeatCount(id, seatCount) {
      const count = Math.max(0, Math.min(64, Math.round(seatCount)));
      patchTable(id, (table) => {
        const offsets =
          table.chairLayoutMode === "custom"
            ? computeAutoSeatOffsets(table.shape, table.size, count)
            : null;
        // Keep existing seat ids for surviving indices so seated guests aren't
        // dropped; only mint placeholder ids for newly-added seats.
        const byIndex = new Map(table.seats.map((seat) => [seat.index, seat]));
        const seats: Seat[] = Array.from({ length: count }, (_, index) => {
          const offset = offsets ? (offsets[index] ?? null) : null;
          const current = byIndex.get(index);
          if (current) return { ...current, offset: offsets ? offset : current.offset };
          return { id: `tmp-${table.id}-${index}`, tableId: table.id, index, label: null, offset };
        });
        return { ...table, seats };
      });
      persist(id, { seatCount: count });
    },

    setChairMode(id, mode) {
      patchTable(id, (table) => {
        if (mode === "custom") {
          const offsets = computeAutoSeatOffsets(table.shape, table.size, table.seats.length);
          // Preserve seat ids (and their guest assignments) — just give each
          // seat the explicit offset it already sits at under the auto layout.
          return {
            ...table,
            chairLayoutMode: mode,
            seats: table.seats.map((seat) => ({
              ...seat,
              offset: offsets[seat.index] ?? seat.offset,
            })),
          };
        }
        return { ...table, chairLayoutMode: mode };
      });
      persist(id, { chairLayoutMode: mode });
    },

    setSeatOffset(id, seatIndex, offset) {
      let nextSeats: Seat[] = [];
      patchTable(id, (table) => {
        nextSeats = table.seats.map((seat) =>
          seat.index === seatIndex ? { ...seat, offset } : seat,
        );
        return { ...table, seats: nextSeats };
      });
      persist(id, {
        chairLayoutMode: "custom",
        seats: nextSeats.map((seat) => ({
          index: seat.index,
          label: seat.label,
          offset: seat.offset,
        })),
      });
    },

    async duplicateSelected() {
      const { floorPlanId, tables, selectedIds } = get();
      if (!floorPlanId || selectedIds.length === 0) return;

      const originals = tables.filter((table) => selectedIds.includes(table.id));
      const created: Table[] = [];

      for (const original of originals) {
        const input: TableInput = {
          label: original.label,
          shape: original.shape,
          position: { x: original.position.x + 24, y: original.position.y + 24 },
          rotation: original.rotation,
          size: original.size,
          chairLayoutMode: original.chairLayoutMode,
          ...(original.chairLayoutMode === "custom"
            ? {
                seats: original.seats.map((seat) => ({
                  index: seat.index,
                  label: seat.label,
                  offset: seat.offset,
                })),
              }
            : { seatCount: original.seats.length }),
        };
        try {
          created.push(await createTable(floorPlanId, input));
        } catch {
          set({ saveStatus: "error" });
        }
      }

      if (created.length > 0) {
        set((state) => ({
          tables: [...state.tables, ...created],
          selectedIds: created.map((table) => table.id),
        }));
      }
    },

    async deleteSelected() {
      const { floorPlanId, selectedIds } = get();
      if (!floorPlanId || selectedIds.length === 0) return;

      const ids = [...selectedIds];
      set((state) => ({
        tables: state.tables.filter((table) => !ids.includes(table.id)),
        selectedIds: [],
      }));

      for (const id of ids) {
        try {
          await deleteTable(floorPlanId, id);
        } catch {
          set({ saveStatus: "error" });
        }
      }
    },
  };
});
