import { describe, expect, it } from "vitest";

import { addGuests, assignSeat } from "../guestOps.js";
import { layoutViews } from "../layoutOps.js";
import { eventDocSchema } from "../schema.js";
import {
  EVENT_TEMPLATES,
  applyTemplate,
  createEventFromTemplate,
  createSampleEvent,
  findTemplate,
} from "../templates.js";

const valid = (doc: unknown) => {
  const result = eventDocSchema.safeParse(doc);
  if (!result.success) throw new Error(result.error.issues[0].message);
};

describe("templates", () => {
  it.each(EVENT_TEMPLATES.map((t) => [t.id, t] as const))(
    "%s builds a valid room with no guests",
    (_id, template) => {
      const doc = createEventFromTemplate(template, "From template");
      valid(doc);
      expect(doc.guests).toEqual([]);
      expect(doc.dimensions).toEqual(template.floor);
      const seats = layoutViews(doc).reduce(
        (sum, view) => sum + view.tables.reduce((n, t) => n + t.seats.length, 0),
        0,
      );
      expect(seats).toBeGreaterThan(0);
    },
  );

  it("keeps everything inside the floor", () => {
    for (const template of EVENT_TEMPLATES) {
      const doc = createEventFromTemplate(template, "x");
      for (const view of layoutViews(doc)) {
        for (const item of [...view.tables, ...view.objects]) {
          expect(item.position.x, `${template.id}`).toBeGreaterThan(0);
          expect(item.position.x, `${template.id}`).toBeLessThan(template.floor.width);
          expect(item.position.y, `${template.id}`).toBeGreaterThan(0);
          expect(item.position.y, `${template.id}`).toBeLessThan(template.floor.height);
        }
      }
    }
  });

  it("ceremony + reception has two layouts", () => {
    const doc = createEventFromTemplate(findTemplate("ceremony-and-reception")!, "x");
    expect(doc.layouts.map((l) => l.name)).toEqual(["Ceremony", "Reception"]);
    // It opens on the ceremony (the first layout): rows of chairs.
    expect(doc.activeLayoutId).toBe(doc.layouts[0].id);
    expect(doc.tables.every((table) => table.shape === "row")).toBe(true);
  });

  it("applying a template replaces the room but keeps guests (unseated)", () => {
    const start = createEventFromTemplate(findTemplate("dinner-party")!, "x");
    const withGuest = addGuests(start, [{ name: "Ada" }]);
    const seated = assignSeat(withGuest.doc, withGuest.guestIds[0], start.tables[0].seats[0].id);
    const applied = applyTemplate(seated, findTemplate("gala")!);
    valid(applied);
    expect(applied.guests).toHaveLength(1);
    expect(applied.guests[0].seatId).toBeNull();
    expect(applied.tables).toHaveLength(15);
  });
});

describe("sample event", () => {
  it("is a valid, mostly seated wedding with households, meals and a rule", () => {
    const doc = createSampleEvent();
    valid(doc);
    expect(doc.guests).toHaveLength(46);
    expect(doc.households.length).toBeGreaterThan(5);
    expect(doc.rules).toHaveLength(1);
    const seated = doc.guests.filter((g) => g.seatId).length;
    expect(seated).toBeGreaterThan(30);
    expect(seated).toBeLessThan(46);
    expect(doc.guests.every((g) => g.meal)).toBe(true);
  });
});
