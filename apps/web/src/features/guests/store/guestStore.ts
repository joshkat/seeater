import type { EventDoc, GuestInput, GuestPatch } from "@seating/shared";
import {
  addGuests,
  assignGuestsToTable,
  assignSeat,
  removeGuest,
  updateGuest,
} from "@seating/shared";
import { create } from "zustand";

import { useDocumentStore } from "../../editor/store/documentStore";

/** Result of seating a group at a table. */
export interface TableAssignResult {
  assigned: number;
  /** Open seats that were available on the table. */
  capacity: number;
}

/**
 * Guest-panel state (which guests are selected) plus guest actions.
 *
 * Guests and their seats live in the open document (documentStore); every
 * action applies a pure op from @seating/shared, which also persists it. Seat
 * displacement and "table deleted → guests unassigned" are handled inside
 * those ops, so there is no reconciliation step here.
 */
interface GuestState {
  /** Guests highlighted for assignment (click a seat / drag / assign-to-table). */
  selectedGuestIds: string[];

  addGuest: (input: GuestInput) => void;
  /** Adds many guests; returns how many were added. */
  importGuests: (inputs: GuestInput[]) => number;
  editGuest: (guestId: string, patch: GuestPatch) => void;
  removeGuest: (guestId: string) => void;
  assignSeat: (guestId: string, seatId: string | null) => void;
  /** Seat the given guests into a table's open seats (first-come). */
  assignGuestsToTable: (guestIds: string[], tableId: string) => TableAssignResult;
  /** Select a guest. `additive` (ctrl/cmd-click) toggles them in the set. */
  selectGuest: (guestId: string, additive?: boolean) => void;
  clearGuestSelection: () => void;
  reset: () => void;
}

function edit(change: (doc: EventDoc) => EventDoc): void {
  useDocumentStore.getState().apply(change);
}

export const useGuestStore = create<GuestState>((set) => ({
  selectedGuestIds: [],

  addGuest(input) {
    edit((doc) => addGuests(doc, [input]).doc);
  },

  importGuests(inputs) {
    let added = 0;
    edit((doc) => {
      const result = addGuests(doc, inputs);
      added = result.guestIds.length;
      return result.doc;
    });
    return added;
  },

  editGuest(guestId, patch) {
    edit((doc) => updateGuest(doc, guestId, patch));
  },

  removeGuest(guestId) {
    edit((doc) => removeGuest(doc, guestId));
    set((state) => ({
      selectedGuestIds: state.selectedGuestIds.filter((id) => id !== guestId),
    }));
  },

  assignSeat(guestId, seatId) {
    edit((doc) => assignSeat(doc, guestId, seatId));
    set({ selectedGuestIds: [] });
  },

  assignGuestsToTable(guestIds, tableId) {
    let outcome: TableAssignResult = { assigned: 0, capacity: 0 };
    edit((doc) => {
      const result = assignGuestsToTable(doc, guestIds, tableId);
      outcome = { assigned: result.assigned, capacity: result.capacity };
      return result.doc;
    });
    set({ selectedGuestIds: [] });
    return outcome;
  },

  selectGuest(guestId, additive = false) {
    set((state) => {
      if (additive) {
        return state.selectedGuestIds.includes(guestId)
          ? { selectedGuestIds: state.selectedGuestIds.filter((id) => id !== guestId) }
          : { selectedGuestIds: [...state.selectedGuestIds, guestId] };
      }
      // Plain click toggles single selection.
      const isOnlySelection =
        state.selectedGuestIds.length === 1 && state.selectedGuestIds[0] === guestId;
      return { selectedGuestIds: isOnlySelection ? [] : [guestId] };
    });
  },

  clearGuestSelection() {
    set({ selectedGuestIds: [] });
  },

  reset() {
    set({ selectedGuestIds: [] });
  },
}));
