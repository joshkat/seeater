import type { EventDoc, HouseholdSplit, TableAssignResult } from "@seating/shared";
import {
  MAX_SEAT_COUNT,
  addChairsAndAssign,
  applySeatPlan,
  assignGuestsToTable,
  expandToHouseholds,
  householdSplits,
  isExactSeatPlacement,
  openSeatCount,
  setSeatCount,
} from "@seating/shared";
import { create } from "zustand";

import { useDocumentStore } from "../../editor/store/documentStore";
import { tableNameById } from "../../editor/lib/tableLabel";
import {
  type PlacementState,
  createPlacement,
  placementPlan,
  unplacedIncoming,
} from "../../placement/lib/placementModel";
import { useGuestStore } from "./guestStore";

/** Where a group of guests is being seated. */
export type SeatTarget =
  | { kind: "table"; tableId: string }
  /** A specific chair (only honoured for a single guest; groups fill its table). */
  | { kind: "seat"; tableId: string; seatId: string };

/** "This would split a household — move everyone?" */
export interface HouseholdQuestion {
  guestIds: string[];
  target: SeatTarget;
  splits: HouseholdSplit[];
}

/** Guests that didn't fit at the last table tried. They stay selected. */
export interface Overflow {
  /** The table that ran out of room. */
  tableId: string;
  guestIds: string[];
}

export interface SeatingNotice {
  id: number;
  text: string;
}

/**
 * The seating flow: every way of seating guests (drag onto the canvas, click a
 * seat, "Assign to table…") goes through `requestSeating`.
 *
 * 1. If the move would split a household, ask first (move the whole household,
 *    or only the guests picked).
 * 2. With exact seat placement on (per event, see isExactSeatPlacement), open
 *    the placement dialog to pick chairs. Otherwise seat as many as fit,
 *    keeping households whole.
 * 3. Anyone left over stays selected and the overflow prompt offers another
 *    table, splitting a household here, adding chairs, or leaving them
 *    unseated — repeated until everyone is placed or skipped.
 *
 * The document edits are pure ops from @seating/shared; this store only holds
 * the prompts' state (and the placement dialog's working copy).
 */
interface SeatingFlowState {
  question: HouseholdQuestion | null;
  overflow: Overflow | null;
  notice: SeatingNotice | null;
  /** The seat placement dialog, while open. */
  placement: PlacementState | null;

  /** Opens the placement dialog for a table (prefilled with who's there),
   * with `incomingIds` waiting in the tray. */
  openPlacement: (tableId: string, incomingIds: string[]) => void;
  /** Edits the dialog's working state (pure functions from placementModel). */
  updatePlacement: (change: (state: PlacementState) => PlacementState) => void;
  /** Applies the dialog as one document change. */
  confirmPlacement: () => void;
  /** Closes the dialog without changing anything. */
  cancelPlacement: () => void;

  requestSeating: (guestIds: string[], target: SeatTarget) => void;
  /** Answers the household question: everyone in the household, or only those picked. */
  answerHousehold: (wholeHousehold: boolean) => void;
  /** Seats the leftover guests at another table. */
  placeOverflowAt: (tableId: string) => void;
  /** Fills the overflow table's remaining seats even if that splits a household. */
  splitOverflow: () => void;
  /** Adds chairs to the overflow table and seats the leftovers there. */
  addChairsForOverflow: () => void;
  /** Gives up on the leftovers: they keep their current seat (or none) and
   * the selection clears. */
  leaveUnseated: () => void;
  /** Closes whichever prompt is open without seating anyone. */
  dismiss: () => void;
  clearNotice: () => void;
  reset: () => void;
}

let noticeId = 0;

function currentDoc(): EventDoc | null {
  return useDocumentStore.getState().doc;
}

/** Applies a table-seating op and returns its result (or null with no open doc). */
function applySeating(seat: (doc: EventDoc) => TableAssignResult): TableAssignResult | null {
  let result: TableAssignResult | null = null;
  useDocumentStore.getState().apply((doc) => {
    result = seat(doc);
    return result.doc;
  });
  return result;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export const useSeatingFlowStore = create<SeatingFlowState>((set, get) => {
  /** Shows the outcome of a table seating and sets up the next round, if any. */
  const settle = (result: TableAssignResult | null, tableId: string, extra = ""): void => {
    if (!result) return;
    const doc = currentDoc();
    const name = doc ? tableNameById(doc.tables, tableId) : "the table";
    if (result.unseatedIds.length === 0) {
      useGuestStore.getState().clearGuestSelection();
      set({
        question: null,
        overflow: null,
        notice: {
          id: ++noticeId,
          text: `Seated ${plural(result.assigned, "guest")} at ${name}${extra}.`,
        },
      });
      return;
    }
    useGuestStore.getState().setGuestSelection(result.unseatedIds);
    set({ question: null, overflow: { tableId, guestIds: result.unseatedIds }, notice: null });
  };

  const openPlacementFor = (tableId: string, incomingIds: string[]): void => {
    const doc = currentDoc();
    const placement = doc ? createPlacement(doc, tableId, incomingIds) : null;
    set({ question: null, overflow: null, notice: null, placement });
  };

  const seat = (guestIds: string[], target: SeatTarget): void => {
    if (target.kind === "seat" && guestIds.length === 1) {
      useGuestStore.getState().assignSeat(guestIds[0], target.seatId);
      set({ question: null, overflow: null });
      return;
    }
    const doc = currentDoc();
    if (doc && isExactSeatPlacement(doc)) {
      openPlacementFor(target.tableId, guestIds);
      return;
    }
    settle(
      applySeating((doc) => assignGuestsToTable(doc, guestIds, target.tableId)),
      target.tableId,
    );
  };

  return {
    question: null,
    overflow: null,
    notice: null,
    placement: null,

    openPlacement(tableId, incomingIds) {
      openPlacementFor(tableId, incomingIds);
    },

    updatePlacement(change) {
      set((state) => (state.placement ? { placement: change(state.placement) } : state));
    },

    confirmPlacement() {
      const { placement } = get();
      if (!placement) return;
      const plan = placementPlan(placement);
      if (plan.length > 0) useDocumentStore.getState().apply((doc) => applySeatPlan(doc, plan));
      const left = unplacedIncoming(placement);
      if (left.length > 0) {
        // Same as auto-fill: leftovers stay selected under the overflow prompt.
        useGuestStore.getState().setGuestSelection(left);
        set({ placement: null, overflow: { tableId: placement.tableId, guestIds: left } });
        return;
      }
      useGuestStore.getState().clearGuestSelection();
      const doc = currentDoc();
      const name = doc ? tableNameById(doc.tables, placement.tableId) : "the table";
      set({
        placement: null,
        notice: plan.length > 0 ? { id: ++noticeId, text: `Seating saved at ${name}.` } : null,
      });
    },

    cancelPlacement() {
      set({ placement: null });
    },

    requestSeating(guestIds, target) {
      const doc = currentDoc();
      if (!doc || guestIds.length === 0) return;
      const splits = householdSplits(doc, guestIds, target.tableId);
      if (splits.length > 0) {
        set({ question: { guestIds, target, splits }, overflow: null, notice: null });
        return;
      }
      seat(guestIds, target);
    },

    answerHousehold(wholeHousehold) {
      const { question } = get();
      const doc = currentDoc();
      if (!question || !doc) return;
      const guestIds = wholeHousehold
        ? expandToHouseholds(doc, question.guestIds)
        : question.guestIds;
      if (wholeHousehold) useGuestStore.getState().setGuestSelection(guestIds);
      seat(guestIds, question.target);
    },

    placeOverflowAt(tableId) {
      const { overflow } = get();
      if (!overflow) return;
      // These guests already passed the household check (or the user chose
      // to split), so go straight to seating.
      seat(overflow.guestIds, { kind: "table", tableId });
    },

    splitOverflow() {
      const { overflow } = get();
      if (!overflow) return;
      settle(
        applySeating((doc) =>
          assignGuestsToTable(doc, overflow.guestIds, overflow.tableId, { splitHouseholds: true }),
        ),
        overflow.tableId,
      );
    },

    addChairsForOverflow() {
      const { overflow } = get();
      const doc = currentDoc();
      if (!overflow || !doc) return;
      if (isExactSeatPlacement(doc)) {
        // Add the chairs, then let the user pick them in the dialog.
        const table = doc.tables.find((candidate) => candidate.id === overflow.tableId);
        if (!table) return;
        const short = overflow.guestIds.length - openSeatCount(doc, table.id, overflow.guestIds);
        const count = Math.min(MAX_SEAT_COUNT, table.seats.length + Math.max(0, short));
        useDocumentStore.getState().apply((current) => setSeatCount(current, table.id, count));
        openPlacementFor(table.id, overflow.guestIds);
        return;
      }
      let added = 0;
      const result = applySeating((doc) => {
        const outcome = addChairsAndAssign(doc, overflow.guestIds, overflow.tableId);
        added = outcome.addedChairs;
        return outcome;
      });
      settle(result, overflow.tableId, added > 0 ? ` (added ${plural(added, "chair")})` : "");
    },

    leaveUnseated() {
      useGuestStore.getState().clearGuestSelection();
      set({ overflow: null, question: null });
    },

    dismiss() {
      set({ overflow: null, question: null, placement: null });
    },

    clearNotice() {
      set({ notice: null });
    },

    reset() {
      set({ question: null, overflow: null, notice: null, placement: null });
    },
  };
});
