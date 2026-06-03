import type { Table, TableInput } from "@seating/shared";

/**
 * Debounced, per-table autosave queue.
 *
 * Rapid edits (dragging, resizing) are coalesced into a single PATCH per table
 * after a short idle delay. Patches for the same table are merged so the latest
 * values win. If a newer edit is queued while a request is in flight, the
 * response is dropped to avoid clobbering fresher local state.
 */

const DELAY_MS = 350;

const pendingPatches = new Map<string, Partial<TableInput>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export interface PersistHandlers {
  persist: (tableId: string, patch: Partial<TableInput>) => Promise<Table>;
  onStart: () => void;
  onResult: (tableId: string, table: Table) => void;
  onError: (error: unknown) => void;
}

export function schedulePersist(
  tableId: string,
  patch: Partial<TableInput>,
  handlers: PersistHandlers,
): void {
  pendingPatches.set(tableId, { ...pendingPatches.get(tableId), ...patch });

  const existing = timers.get(tableId);
  if (existing) clearTimeout(existing);

  timers.set(
    tableId,
    setTimeout(async () => {
      timers.delete(tableId);
      const body = pendingPatches.get(tableId) ?? {};
      pendingPatches.delete(tableId);

      handlers.onStart();
      try {
        const table = await handlers.persist(tableId, body);
        // Skip reconcile if a newer edit was queued while we were saving.
        if (!timers.has(tableId)) {
          handlers.onResult(tableId, table);
        }
      } catch (error) {
        handlers.onError(error);
      }
    }, DELAY_MS),
  );
}

/** True while any table still has unsaved/in-flight changes. */
export function hasPendingPersists(): boolean {
  return timers.size > 0;
}
