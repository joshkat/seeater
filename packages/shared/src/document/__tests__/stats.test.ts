import { describe, expect, it } from "vitest";

import { addGuests, assignSeat, updateGuest } from "../guestOps.js";
import { addLayout, layoutViews } from "../layoutOps.js";
import { NO_MEAL, guestTotals, layoutStats } from "../stats.js";
import { fixture, seatIdsOf } from "./fixture.js";

function scenario() {
  const { doc, tableId, guestIds } = fixture();
  const [ada, grace, linus] = guestIds;
  const seats = seatIdsOf(doc, tableId);
  const extra = addGuests(doc, [{ name: "Tom", meal: "Fish", isChild: true, dietary: "Nuts" }]);
  const tom = extra.guestIds[0];
  let next = updateGuest(extra.doc, ada, { meal: "Fish", rsvpStatus: "accepted" });
  next = updateGuest(next, grace, { meal: "Chicken", rsvpStatus: "declined" });
  next = assignSeat(next, ada, seats[0]);
  next = assignSeat(next, grace, seats[1]);
  next = assignSeat(next, tom, seats[2]);
  return { doc: next, tableId, ids: { ada, grace, linus, tom } };
}

describe("stats", () => {
  it("totals guests for a layout", () => {
    const { doc } = scenario();
    const [view] = layoutViews(doc);
    expect(guestTotals(doc.guests, view.seating)).toEqual({
      total: 4,
      seated: 3,
      unseated: 1,
      going: 1,
      pending: 2,
      declined: 1,
      needSeat: 1,
      children: 1,
    });
  });

  it("gives per-table fill, meals (declined excluded), children and needs", () => {
    const { doc, tableId } = scenario();
    const stats = layoutStats(doc, layoutViews(doc)[0]);
    expect(stats.chairs).toBe(4);
    expect(stats.tables).toEqual([
      {
        tableId,
        label: "Table 1",
        chairs: 4,
        seated: 3,
        meals: [["Fish", 2]],
        children: 1,
        needs: ["Tom: Nuts"],
      },
    ]);
    expect(stats.meals).toEqual([["Fish", 2]]);
  });

  it("works for an inactive layout and counts unchosen meals", () => {
    const { doc, ids } = scenario();
    const withSecond = addLayout(doc, "Copy", "tables-and-seating").doc;
    const views = layoutViews(withSecond);
    const main = views.find((view) => !view.active)!;
    expect(layoutStats(withSecond, main).seated.seated).toBe(3);
    const fresh = layoutStats(addGuests(withSecond, []).doc, views.find((v) => v.active)!);
    expect(fresh.tables[0].seated).toBe(3);
    const noMeal = updateGuest(withSecond, ids.tom, { meal: null });
    expect(layoutStats(noMeal, layoutViews(noMeal)[1]).meals).toEqual([
      ["Fish", 1],
      [NO_MEAL, 1],
    ]);
  });
});
