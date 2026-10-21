import type {
  Backdrop,
  ExactSeatPlacement,
  Guest,
  Household,
  Layout,
  RoomObject,
  Size,
  Table,
  UnitSystem,
} from "@seating/shared";
import { DEFAULT_FLOOR_PLAN_SIZE, EXACT_SEAT_PLACEMENT_MAX_TABLES } from "@seating/shared";

import { resolveUnits } from "../lib/units";
import { useDocumentStore } from "../store/documentStore";

/**
 * Narrow subscriptions to the open document. The empty fallbacks are module
 * constants so components don't re-render on referentially-new empty arrays.
 */

const NO_TABLES: Table[] = [];
const NO_GUESTS: Guest[] = [];
const NO_HOUSEHOLDS: Household[] = [];
const NO_LAYOUTS: Layout[] = [];
const NO_OBJECTS: RoomObject[] = [];

export function useTables(): Table[] {
  return useDocumentStore((state) => state.doc?.tables ?? NO_TABLES);
}

export function useGuests(): Guest[] {
  return useDocumentStore((state) => state.doc?.guests ?? NO_GUESTS);
}

export function useHouseholds(): Household[] {
  return useDocumentStore((state) => state.doc?.households ?? NO_HOUSEHOLDS);
}

export function useDimensions(): Size {
  return useDocumentStore((state) => state.doc?.dimensions ?? DEFAULT_FLOOR_PLAN_SIZE);
}

export function useEventName(): string {
  return useDocumentStore((state) => state.doc?.name ?? "");
}

export function useDocumentId(): string | null {
  return useDocumentStore((state) => state.doc?.id ?? null);
}

/** This event's exact-seat-placement setting and whether it's in effect now
 * (same rule as the shared `isExactSeatPlacement`). */
export function useExactSeatPlacement(): { mode: ExactSeatPlacement; active: boolean } {
  const mode = useDocumentStore((state) => state.doc?.settings.exactSeatPlacement ?? "auto");
  const tableCount = useDocumentStore((state) => state.doc?.tables.length ?? 0);
  const active = mode === "auto" ? tableCount <= EXACT_SEAT_PLACEMENT_MAX_TABLES : mode === "on";
  return { mode, active };
}

/** The unit system to show lengths in (setting resolved against the locale). */
export function useUnits(): { setting: UnitSystem; units: "metric" | "imperial" } {
  const setting = useDocumentStore((state) => state.doc?.settings.units ?? "auto");
  return { setting, units: resolveUnits(setting) };
}

/** Whether there's anything to undo or redo in the open document. */
export function useHistoryAvailability(): { canUndo: boolean; canRedo: boolean } {
  const canUndo = useDocumentStore((state) => state.history.past.length > 0);
  const canRedo = useDocumentStore((state) => state.history.future.length > 0);
  return { canUndo, canRedo };
}

export function useRoomObjects(): RoomObject[] {
  return useDocumentStore((state) => state.doc?.objects ?? NO_OBJECTS);
}

export function useBackdrop(): Backdrop | null {
  return useDocumentStore((state) => state.doc?.backdrop ?? null);
}

export function useLayouts(): Layout[] {
  return useDocumentStore((state) => state.doc?.layouts ?? NO_LAYOUTS);
}

export function useActiveLayoutId(): string | null {
  return useDocumentStore((state) => state.doc?.activeLayoutId ?? null);
}
