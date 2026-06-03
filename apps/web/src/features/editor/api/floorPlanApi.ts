import type {
  DuplicateFloorPlanOptions,
  FloorPlan,
  FloorPlanInput,
  FloorPlanSummary,
  FloorPlanUpdateInput,
  Table,
  TableInput,
} from "@seating/shared";

import { apiRequest } from "../../../lib/apiClient";

/** Thin API surface for floor plans and their tables. */

export function listFloorPlans(): Promise<FloorPlan[]> {
  return apiRequest<FloorPlan[]>("/floor-plans");
}

/** Lightweight list (metadata + counts) for the events dashboard. */
export function listFloorPlanSummaries(): Promise<FloorPlanSummary[]> {
  return apiRequest<FloorPlanSummary[]>("/floor-plans/summaries");
}

export function getFloorPlan(id: string): Promise<FloorPlan> {
  return apiRequest<FloorPlan>(`/floor-plans/${id}`);
}

export function createFloorPlan(body: FloorPlanInput): Promise<FloorPlan> {
  return apiRequest<FloorPlan>("/floor-plans", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateFloorPlan(id: string, patch: FloorPlanUpdateInput): Promise<FloorPlan> {
  return apiRequest<FloorPlan>(`/floor-plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteFloorPlan(id: string): Promise<void> {
  return apiRequest<void>(`/floor-plans/${id}`, { method: "DELETE" });
}

export function duplicateFloorPlan(
  id: string,
  options: DuplicateFloorPlanOptions = {},
): Promise<FloorPlan> {
  return apiRequest<FloorPlan>(`/floor-plans/${id}/duplicate`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export function createTable(floorPlanId: string, input: TableInput): Promise<Table> {
  return apiRequest<Table>(`/floor-plans/${floorPlanId}/tables`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Partial update of a table. Seats only re-sync when seat fields are sent. */
export function updateTable(
  floorPlanId: string,
  tableId: string,
  patch: Partial<TableInput>,
): Promise<Table> {
  return apiRequest<Table>(`/floor-plans/${floorPlanId}/tables/${tableId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteTable(floorPlanId: string, tableId: string): Promise<void> {
  return apiRequest<void>(`/floor-plans/${floorPlanId}/tables/${tableId}`, {
    method: "DELETE",
  });
}
