import type { EventDoc, SeatPlanEntry } from "@seating/shared";
import { tableIdBySeat } from "@seating/shared";

/**
 * The seat placement dialog's working state. Nothing touches the document
 * until Confirm, which turns this into one `applySeatPlan` edit; Cancel just
 * drops it. All functions are pure and return a new state.
 */
export interface PlacementState {
  tableId: string;
  /** The table's seat ids, in order. */
  seatIds: string[];
  /** Who sits where right now (in the dialog). */
  bySeat: Record<string, string | null>;
  /** Guests in the dialog but not on a chair, in display order. */
  tray: string[];
  /** Everyone involved → the seat they had when the dialog opened. */
  original: Record<string, string | null>;
  /** Guests brought in to be seated (vs. those already at the table). */
  incoming: string[];
  /** Guest picked for tap-to-place (tap a chip, then a chair). */
  picked: string | null;
  /** A move onto an occupied chair, waiting for "replace?" confirmation. */
  pending: { guestId: string; seatId: string } | null;
}

/** Opens the dialog for a table: its current occupants on their chairs, plus
 * `incomingIds` (guests not already at this table) in the tray. */
export function createPlacement(
  doc: EventDoc,
  tableId: string,
  incomingIds: string[],
): PlacementState | null {
  const table = doc.tables.find((candidate) => candidate.id === tableId);
  if (!table) return null;
  const seatIds = [...table.seats].sort((a, b) => a.index - b.index).map((seat) => seat.id);
  const onTable = new Set(seatIds);
  const guestById = new Map(doc.guests.map((guest) => [guest.id, guest]));

  const bySeat: Record<string, string | null> = Object.fromEntries(seatIds.map((id) => [id, null]));
  const original: Record<string, string | null> = {};
  for (const guest of doc.guests) {
    if (guest.seatId && onTable.has(guest.seatId)) {
      bySeat[guest.seatId] = guest.id;
      original[guest.id] = guest.seatId;
    }
  }
  const tray: string[] = [];
  for (const id of new Set(incomingIds)) {
    const guest = guestById.get(id);
    if (!guest || id in original) continue;
    original[id] = guest.seatId;
    tray.push(id);
  }
  return {
    tableId,
    seatIds,
    bySeat,
    tray,
    original,
    incoming: tray.slice(),
    picked: null,
    pending: null,
  };
}

/** The chair a guest is on in the dialog, if any. */
export function seatOfGuest(state: PlacementState, guestId: string): string | null {
  return state.seatIds.find((seatId) => state.bySeat[seatId] === guestId) ?? null;
}

/**
 * "+ Add guest…": brings someone without a seat into the tray, picked so the
 * next chair tapped is theirs. Nothing changes for them unless they get a
 * chair before Confirm. Anyone already in the dialog is left as is.
 */
export function addToTray(state: PlacementState, guestId: string): PlacementState {
  if (guestId in state.original) return state;
  return {
    ...state,
    tray: [...state.tray, guestId],
    original: { ...state.original, [guestId]: null },
    picked: guestId,
    pending: null,
  };
}

/** Guests who could be added from "+ Add guest…": no seat in this layout,
 * not declined, and not in the dialog already. */
export function addableGuests(doc: EventDoc, state: PlacementState): EventDoc["guests"] {
  return doc.guests.filter(
    (guest) => !guest.seatId && guest.rsvpStatus !== "declined" && !(guest.id in state.original),
  );
}

/** Tap a chip (or a seated guest): pick it for tap-to-place; tap again to unpick. */
export function pickGuest(state: PlacementState, guestId: string | null): PlacementState {
  return { ...state, picked: state.picked === guestId ? null : guestId, pending: null };
}

function withoutGuest(state: PlacementState, guestId: string): PlacementState {
  const seat = seatOfGuest(state, guestId);
  return {
    ...state,
    bySeat: seat ? { ...state.bySeat, [seat]: null } : state.bySeat,
    tray: state.tray.filter((id) => id !== guestId),
  };
}

/**
 * Puts a guest on a chair. An empty chair (or their own) just works; a chair
 * someone else holds sets `pending` so the dialog can ask first (see
 * `resolvePending`).
 */
export function placeGuest(state: PlacementState, guestId: string, seatId: string): PlacementState {
  if (!(seatId in state.bySeat)) return state;
  const occupant = state.bySeat[seatId];
  if (occupant === guestId) return { ...state, picked: null, pending: null };
  if (occupant) return { ...state, pending: { guestId, seatId } };
  const cleared = withoutGuest(state, guestId);
  return {
    ...cleared,
    bySeat: { ...cleared.bySeat, [seatId]: guestId },
    picked: null,
    pending: null,
  };
}

/** Whether the pending move can be a swap (the mover is coming from a chair). */
export function canSwap(state: PlacementState): boolean {
  return state.pending !== null && seatOfGuest(state, state.pending.guestId) !== null;
}

/**
 * Answers "this chair is taken": `swap` trades chairs (only when the mover
 * came from a chair), `replace` sends the occupant to the tray, `cancel`
 * keeps everything as it was.
 */
export function resolvePending(
  state: PlacementState,
  choice: "swap" | "replace" | "cancel",
): PlacementState {
  const { pending } = state;
  if (!pending || choice === "cancel") return { ...state, pending: null };
  const occupant = state.bySeat[pending.seatId];
  if (!occupant) return placeGuest({ ...state, pending: null }, pending.guestId, pending.seatId);
  const fromSeat = seatOfGuest(state, pending.guestId);

  if (choice === "swap" && fromSeat) {
    return {
      ...state,
      bySeat: { ...state.bySeat, [fromSeat]: occupant, [pending.seatId]: pending.guestId },
      picked: null,
      pending: null,
    };
  }
  const cleared = withoutGuest(state, pending.guestId);
  return {
    ...cleared,
    bySeat: { ...cleared.bySeat, [pending.seatId]: pending.guestId },
    tray: [occupant, ...cleared.tray],
    picked: null,
    pending: null,
  };
}

/** Takes a guest off their chair and back to the tray. */
export function unplaceGuest(state: PlacementState, guestId: string): PlacementState {
  if (!seatOfGuest(state, guestId)) return { ...state, picked: null };
  const cleared = withoutGuest(state, guestId);
  return { ...cleared, tray: [guestId, ...cleared.tray], picked: null, pending: null };
}

/**
 * Where a guest left in the tray ends up after Confirm: someone who was at
 * this table loses their seat; someone from elsewhere keeps the seat they had.
 */
export function trayOutcome(
  state: PlacementState,
  guestId: string,
): "unseated" | "stays" | "unassigned" {
  const was = state.original[guestId] ?? null;
  if (was === null) return "unassigned";
  return state.seatIds.includes(was) ? "unseated" : "stays";
}

/** The seat changes to apply on Confirm (only what actually changed). */
export function placementPlan(state: PlacementState): SeatPlanEntry[] {
  const entries: SeatPlanEntry[] = [];
  for (const [guestId, was] of Object.entries(state.original)) {
    const now =
      seatOfGuest(state, guestId) ?? (trayOutcome(state, guestId) === "stays" ? was : null);
    if (now !== was) entries.push({ guestId, seatId: now });
  }
  return entries;
}

/** Incoming guests still in the tray (they didn't get a chair here). */
export function unplacedIncoming(state: PlacementState): string[] {
  return state.incoming.filter((id) => state.tray.includes(id));
}

/** The table each tray guest currently sits at elsewhere, for "stays at …" notes. */
export function elsewhereTableIds(doc: EventDoc, state: PlacementState): Record<string, string> {
  const seatTable = tableIdBySeat(doc);
  const result: Record<string, string> = {};
  for (const guestId of state.tray) {
    const was = state.original[guestId];
    const tableId = was ? seatTable.get(was) : undefined;
    if (tableId && tableId !== state.tableId) result[guestId] = tableId;
  }
  return result;
}
