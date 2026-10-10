import type { Guest, Household, Size, Table } from "@seating/shared";
import { DEFAULT_FLOOR_PLAN_SIZE } from "@seating/shared";

import { useDocumentStore } from "../store/documentStore";

/**
 * Narrow subscriptions to the open document. The empty fallbacks are module
 * constants so components don't re-render on referentially-new empty arrays.
 */

const NO_TABLES: Table[] = [];
const NO_GUESTS: Guest[] = [];
const NO_HOUSEHOLDS: Household[] = [];

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
