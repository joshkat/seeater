import {
  addGuests,
  addTable,
  applySeatPlan,
  assignSeat,
  createEventDoc,
  eventDocSchema,
} from "@seating/shared";
import { describe, expect, it } from "vitest";

import {
  addToTray,
  addableGuests,
  canSwap,
  createPlacement,
  pickGuest,
  placeGuest,
  placementPlan,
  resolvePending,
  trayOutcome,
  unplaceGuest,
  unplacedIncoming,
} from "../lib/placementModel";

/** Table A (4 chairs) with Ada in chair 0; table B (2 chairs) with Linus; Grace and Alan unseated. */
function setup() {
  const base = createEventDoc({ name: "Dinner" });
  const a = addTable(base, { shape: "round", position: { x: 0, y: 0 }, seatCount: 4 });
  const b = addTable(a.doc, { shape: "round", position: { x: 300, y: 0 }, seatCount: 2 });
  const added = addGuests(b.doc, [
    { name: "Ada" },
    { name: "Grace" },
    { name: "Linus" },
    { name: "Alan" },
  ]);
  const [ada, grace, linus, alan] = added.guestIds;
  const seatsA = added.doc.tables[0].seats.map((s) => s.id);
  const seatsB = added.doc.tables[1].seats.map((s) => s.id);
  const doc = assignSeat(assignSeat(added.doc, ada, seatsA[0]), linus, seatsB[0]);
  return { doc, tableA: a.tableId, seatsA, seatsB, ada, grace, linus, alan };
}

describe("placement model", () => {
  it("opens with current occupants on chairs and incoming guests in the tray", () => {
    const { doc, tableA, seatsA, ada, grace, linus } = setup();
    const state = createPlacement(doc, tableA, [grace, linus, ada])!;
    expect(state.bySeat[seatsA[0]]).toBe(ada);
    expect(state.tray).toEqual([grace, linus]);
    expect(placementPlan(state)).toEqual([]);
  });

  it("places by pick-then-chair and produces a one-step plan", () => {
    const { doc, tableA, seatsA, grace } = setup();
    let state = createPlacement(doc, tableA, [grace])!;
    state = pickGuest(state, grace);
    state = placeGuest(state, grace, seatsA[2]);
    expect(state.picked).toBeNull();
    expect(state.tray).toEqual([]);
    const plan = placementPlan(state);
    expect(plan).toEqual([{ guestId: grace, seatId: seatsA[2] }]);
    expect(eventDocSchema.safeParse(applySeatPlan(doc, plan)).success).toBe(true);
  });

  it("asks before replacing, and replace sends the occupant to the tray (unseated)", () => {
    const { doc, tableA, seatsA, ada, grace } = setup();
    let state = createPlacement(doc, tableA, [grace])!;
    state = placeGuest(state, grace, seatsA[0]);
    expect(state.pending).toEqual({ guestId: grace, seatId: seatsA[0] });
    expect(canSwap(state)).toBe(false);
    expect(resolvePending(state, "cancel").bySeat[seatsA[0]]).toBe(ada);
    state = resolvePending(state, "replace");
    expect(state.bySeat[seatsA[0]]).toBe(grace);
    expect(state.tray).toEqual([ada]);
    expect(trayOutcome(state, ada)).toBe("unseated");
    expect(placementPlan(state)).toEqual(
      expect.arrayContaining([
        { guestId: ada, seatId: null },
        { guestId: grace, seatId: seatsA[0] },
      ]),
    );
  });

  it("swaps two guests who are both on chairs", () => {
    const { doc, tableA, seatsA, ada, grace } = setup();
    let state = createPlacement(doc, tableA, [grace])!;
    state = placeGuest(state, grace, seatsA[1]);
    state = placeGuest(state, grace, seatsA[0]);
    expect(canSwap(state)).toBe(true);
    state = resolvePending(state, "swap");
    expect(state.bySeat[seatsA[0]]).toBe(grace);
    expect(state.bySeat[seatsA[1]]).toBe(ada);
  });

  it("keeps a guest from another table where they were if left in the tray", () => {
    const { doc, tableA, seatsA, linus, alan } = setup();
    let state = createPlacement(doc, tableA, [linus, alan])!;
    state = placeGuest(state, alan, seatsA[1]);
    expect(trayOutcome(state, linus)).toBe("stays");
    expect(unplacedIncoming(state)).toEqual([linus]);
    expect(placementPlan(state)).toEqual([{ guestId: alan, seatId: seatsA[1] }]);
  });

  it("unplaces a guest back to the tray", () => {
    const { doc, tableA, seatsA, ada } = setup();
    const state = unplaceGuest(createPlacement(doc, tableA, [])!, ada);
    expect(state.bySeat[seatsA[0]]).toBeNull();
    expect(state.tray).toEqual([ada]);
    expect(placementPlan(state)).toEqual([{ guestId: ada, seatId: null }]);
  });

  it("returns null for a missing table", () => {
    const { doc } = setup();
    expect(createPlacement(doc, "nope", [])).toBeNull();
  });

  it("adds an unseated guest to the tray, seated only if given a chair", () => {
    const { doc, tableA, seatsA, ada, grace, alan } = setup();
    let state = createPlacement(doc, tableA, [])!;
    // Ada is at this table and Linus has a seat elsewhere: only Grace and Alan.
    expect(addableGuests(doc, state).map((guest) => guest.id)).toEqual([grace, alan]);

    state = addToTray(state, grace);
    expect(state.tray).toEqual([grace]);
    expect(state.picked).toBe(grace);
    expect(state.incoming).toEqual([]);
    expect(addableGuests(doc, state).map((guest) => guest.id)).toEqual([alan]);
    // Left in the tray, nothing changes for her.
    expect(placementPlan(state)).toEqual([]);

    state = placeGuest(state, grace, seatsA[1]);
    expect(placementPlan(state)).toEqual([{ guestId: grace, seatId: seatsA[1] }]);
    expect(addToTray(state, ada)).toBe(state);
  });
});
