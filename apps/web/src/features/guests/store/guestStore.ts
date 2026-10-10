import type { EventDoc, GuestInput, GuestPatch } from "@seating/shared";
import {
  addGuests,
  assignSeat,
  createHousehold,
  dissolveHousehold,
  removeFromHousehold,
  removeGuest,
  renameHousehold,
  updateGuest,
} from "@seating/shared";
import { create } from "zustand";

import { useDocumentStore } from "../../editor/store/documentStore";

/**
 * Guest-panel state (which guests are selected) plus guest actions.
 *
 * Guests and their seats live in the open document (documentStore); every
 * action applies a pure op from @seating/shared, which also persists it. Seat
 * displacement and "table deleted → guests unassigned" are handled inside
 * those ops, so there is no reconciliation step here. Seating a group at a
 * table (with household checks and the overflow prompt) lives in
 * seatingFlowStore.
 */
interface GuestState {
  /** Guests highlighted for assignment (click a seat / drag / assign-to-table). */
  selectedGuestIds: string[];
  /** The last guest clicked without Shift: one end of a Shift-click range. */
  anchorGuestId: string | null;

  addGuest: (input: GuestInput) => void;
  /** Adds many guests; returns how many were added. */
  importGuests: (inputs: GuestInput[]) => number;
  editGuest: (guestId: string, patch: GuestPatch) => void;
  removeGuest: (guestId: string) => void;
  /** Seats one guest in one seat (or unseats with null) and clears the selection. */
  assignSeat: (guestId: string, seatId: string | null) => void;

  /** Select a guest. `additive` (ctrl/cmd-click) toggles them in the set. */
  selectGuest: (guestId: string, additive?: boolean) => void;
  /**
   * Shift-click: selects every guest between the anchor and `guestId` in
   * `orderedIds` (the list as displayed). `additive` keeps the existing
   * selection too.
   */
  selectRange: (guestId: string, orderedIds: string[], additive?: boolean) => void;
  /** Replaces the selection (household header, "select next N", overflow). */
  setGuestSelection: (guestIds: string[]) => void;
  clearGuestSelection: () => void;

  groupAsHousehold: (guestIds: string[]) => void;
  renameHousehold: (householdId: string, name: string) => void;
  removeFromHousehold: (guestIds: string[]) => void;
  dissolveHousehold: (householdId: string) => void;

  reset: () => void;
}

function edit(change: (doc: EventDoc) => EventDoc): void {
  useDocumentStore.getState().apply(change);
}

export const useGuestStore = create<GuestState>((set, get) => ({
  selectedGuestIds: [],
  anchorGuestId: null,

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
      anchorGuestId: state.anchorGuestId === guestId ? null : state.anchorGuestId,
    }));
  },

  assignSeat(guestId, seatId) {
    edit((doc) => assignSeat(doc, guestId, seatId));
    set({ selectedGuestIds: [] });
  },

  selectGuest(guestId, additive = false) {
    set((state) => {
      if (additive) {
        return state.selectedGuestIds.includes(guestId)
          ? {
              selectedGuestIds: state.selectedGuestIds.filter((id) => id !== guestId),
              anchorGuestId: guestId,
            }
          : { selectedGuestIds: [...state.selectedGuestIds, guestId], anchorGuestId: guestId };
      }
      // Plain click toggles single selection.
      const isOnlySelection =
        state.selectedGuestIds.length === 1 && state.selectedGuestIds[0] === guestId;
      return { selectedGuestIds: isOnlySelection ? [] : [guestId], anchorGuestId: guestId };
    });
  },

  selectRange(guestId, orderedIds, additive = false) {
    const { anchorGuestId, selectedGuestIds } = get();
    const from = anchorGuestId ? orderedIds.indexOf(anchorGuestId) : -1;
    const to = orderedIds.indexOf(guestId);
    if (to === -1) return;
    // No usable anchor: behave like a plain click.
    if (from === -1) {
      get().selectGuest(guestId, additive);
      return;
    }
    const range = orderedIds.slice(Math.min(from, to), Math.max(from, to) + 1);
    const next = additive ? [...new Set([...selectedGuestIds, ...range])] : range;
    // The anchor stays put so successive Shift-clicks pivot around it.
    set({ selectedGuestIds: next });
  },

  setGuestSelection(guestIds) {
    set({ selectedGuestIds: guestIds, anchorGuestId: guestIds[0] ?? null });
  },

  clearGuestSelection() {
    set({ selectedGuestIds: [] });
  },

  groupAsHousehold(guestIds) {
    edit((doc) => createHousehold(doc, guestIds).doc);
  },

  renameHousehold(householdId, name) {
    edit((doc) => renameHousehold(doc, householdId, name));
  },

  removeFromHousehold(guestIds) {
    edit((doc) => removeFromHousehold(doc, guestIds));
  },

  dissolveHousehold(householdId) {
    edit((doc) => dissolveHousehold(doc, householdId));
  },

  reset() {
    set({ selectedGuestIds: [], anchorGuestId: null });
  },
}));
