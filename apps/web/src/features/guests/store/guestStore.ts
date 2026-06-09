import type { Guest, GuestInput, GuestUpdateInput } from "@seating/shared";
import { create } from "zustand";

import {
  assignGuestSeat,
  bulkCreateGuests,
  createGuest,
  deleteGuest,
  getEventForFloorPlan,
  updateGuest,
} from "../api/guestApi";

type LoadStatus = "idle" | "loading" | "ready" | "error";

/** A guest-to-seat pairing for batch assignment. */
export interface SeatAssignment {
  guestId: string;
  seatId: string;
}

/** Result of assigning a group of guests to a table. */
export interface TableAssignResult {
  assigned: number;
  /** Open seats that were available on the table. */
  capacity: number;
}

interface GuestState {
  eventId: string | null;
  guests: Guest[];
  loadStatus: LoadStatus;
  /** Guests highlighted for assignment (click a seat / drag / assign-to-table). */
  selectedGuestIds: string[];

  loadForFloorPlan: (floorPlanId: string) => Promise<void>;
  addGuest: (input: GuestInput) => Promise<void>;
  importGuests: (inputs: GuestInput[]) => Promise<number>;
  editGuest: (guestId: string, patch: GuestUpdateInput) => Promise<void>;
  removeGuest: (guestId: string) => Promise<void>;
  assignSeat: (guestId: string, seatId: string | null) => Promise<void>;
  /** Assign several guests to specific seats in one optimistic batch. */
  assignManyToSeats: (pairs: SeatAssignment[]) => Promise<void>;
  /** Seat the given guests into a table's open seats (first-come), skipping
   * seats taken by guests not in the group. */
  assignGuestsToTable: (guestIds: string[], tableSeatIds: string[]) => Promise<TableAssignResult>;
  /** Select a guest. `additive` (ctrl/cmd-click) toggles them in the set. */
  selectGuest: (guestId: string, additive?: boolean) => void;
  clearGuestSelection: () => void;
  /** Clears assignments whose seat no longer exists (e.g. a table was deleted),
   * so those guests return to the unassigned list without a refresh. */
  syncAssignments: (validSeatIds: Set<string>) => void;
  reset: () => void;
}

/** Merges server guest rows into the list, replacing matches by id. */
function mergeGuests(current: Guest[], updated: Guest[]): Guest[] {
  const byId = new Map(updated.map((guest) => [guest.id, guest]));
  return current.map((guest) => byId.get(guest.id) ?? guest);
}

export const useGuestStore = create<GuestState>((set, get) => ({
  eventId: null,
  guests: [],
  loadStatus: "idle",
  selectedGuestIds: [],

  async loadForFloorPlan(floorPlanId) {
    set({ loadStatus: "loading" });
    try {
      const event = await getEventForFloorPlan(floorPlanId);
      set({ eventId: event.id, guests: event.guests, loadStatus: "ready" });
    } catch {
      set({ loadStatus: "error" });
    }
  },

  async addGuest(input) {
    const { eventId } = get();
    if (!eventId) return;
    const guest = await createGuest(eventId, input);
    set((state) => ({ guests: [...state.guests, guest] }));
  },

  async importGuests(inputs) {
    const { eventId } = get();
    if (!eventId || inputs.length === 0) return 0;
    const created = await bulkCreateGuests(eventId, inputs);
    set((state) => ({ guests: [...state.guests, ...created] }));
    return created.length;
  },

  async editGuest(guestId, patch) {
    const { eventId, guests } = get();
    if (!eventId) return;
    const previous = guests;
    // Optimistic update.
    set((state) => ({
      guests: state.guests.map((g) => (g.id === guestId ? { ...g, ...patch } : g)),
    }));
    try {
      const updated = await updateGuest(eventId, guestId, patch);
      set((state) => ({ guests: mergeGuests(state.guests, [updated]) }));
    } catch {
      set({ guests: previous });
    }
  },

  async removeGuest(guestId) {
    const { eventId, guests } = get();
    if (!eventId) return;
    const previous = guests;
    set((state) => ({
      guests: state.guests.filter((g) => g.id !== guestId),
      selectedGuestIds: state.selectedGuestIds.filter((id) => id !== guestId),
    }));
    try {
      await deleteGuest(eventId, guestId);
    } catch {
      set({ guests: previous });
    }
  },

  async assignSeat(guestId, seatId) {
    const { eventId, guests } = get();
    if (!eventId) return;
    const previous = guests;
    // Optimistic: seat this guest and free any other guest already in the seat.
    set((state) => ({
      guests: state.guests.map((g) => {
        if (g.id === guestId) return { ...g, seatId };
        if (seatId !== null && g.seatId === seatId) return { ...g, seatId: null };
        return g;
      }),
      selectedGuestIds: [],
    }));
    try {
      const affected = await assignGuestSeat(eventId, guestId, seatId);
      set((state) => ({ guests: mergeGuests(state.guests, affected) }));
    } catch {
      set({ guests: previous });
    }
  },

  async assignManyToSeats(pairs) {
    const { eventId, guests } = get();
    if (!eventId || pairs.length === 0) return;
    const previous = guests;
    const seatByGuest = new Map(pairs.map((p) => [p.guestId, p.seatId]));
    const targetSeats = new Set(pairs.map((p) => p.seatId));
    set((state) => ({
      guests: state.guests.map((g) => {
        const seat = seatByGuest.get(g.id);
        if (seat) return { ...g, seatId: seat };
        // Displace anyone currently sitting in a target seat.
        if (g.seatId && targetSeats.has(g.seatId)) return { ...g, seatId: null };
        return g;
      }),
      selectedGuestIds: [],
    }));
    try {
      const results = await Promise.all(
        pairs.map((p) => assignGuestSeat(eventId, p.guestId, p.seatId)),
      );
      set((state) => ({ guests: mergeGuests(state.guests, results.flat()) }));
    } catch {
      set({ guests: previous });
    }
  },

  async assignGuestsToTable(guestIds, tableSeatIds) {
    const { guests } = get();
    const group = new Set(guestIds);
    // Seats taken by guests NOT in our group are unavailable.
    const takenByOthers = new Set(
      guests.filter((g) => g.seatId && !group.has(g.id)).map((g) => g.seatId),
    );
    const openSeats = tableSeatIds.filter((seatId) => !takenByOthers.has(seatId));

    const pairs: SeatAssignment[] = [];
    for (let i = 0; i < guestIds.length && i < openSeats.length; i += 1) {
      pairs.push({ guestId: guestIds[i], seatId: openSeats[i] });
    }
    await get().assignManyToSeats(pairs);
    return { assigned: pairs.length, capacity: openSeats.length };
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

  syncAssignments(validSeatIds) {
    set((state) => {
      let changed = false;
      const guests = state.guests.map((guest) => {
        if (guest.seatId && !validSeatIds.has(guest.seatId)) {
          changed = true;
          return { ...guest, seatId: null };
        }
        return guest;
      });
      return changed ? { guests } : {};
    });
  },

  reset() {
    set({ eventId: null, guests: [], loadStatus: "idle", selectedGuestIds: [] });
  },
}));
