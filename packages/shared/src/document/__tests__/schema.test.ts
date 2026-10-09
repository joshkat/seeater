import { describe, expect, it } from "vitest";

import { assignSeat } from "../guestOps.js";
import { EventDocError, parseEventDoc } from "../migrate.js";
import { EVENT_DOC_SCHEMA_VERSION, eventDocSchema } from "../schema.js";
import { fixture, seatIdsOf } from "./fixture.js";

describe("eventDocSchema integrity", () => {
  it("accepts a document built by the ops", () => {
    expect(eventDocSchema.safeParse(fixture().doc).success).toBe(true);
  });

  it("rejects two guests in one seat", () => {
    const { doc, tableId } = fixture();
    const seat = seatIdsOf(doc, tableId)[0];
    const broken = { ...doc, guests: doc.guests.map((g) => ({ ...g, seatId: seat })) };
    const result = eventDocSchema.safeParse(broken);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/more than one guest/);
  });

  it("rejects a guest pointing at a missing seat", () => {
    const { doc } = fixture();
    const broken = { ...doc, guests: [{ ...doc.guests[0], seatId: "nope" }] };
    expect(eventDocSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const { doc } = fixture();
    const broken = { ...doc, guests: [doc.guests[0], doc.guests[0]] };
    expect(eventDocSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects blank names", () => {
    const { doc } = fixture();
    expect(eventDocSchema.safeParse({ ...doc, name: "   " }).success).toBe(false);
  });
});

describe("parseEventDoc", () => {
  it("round-trips a valid document through JSON", () => {
    const { doc, tableId, guestIds } = fixture();
    const seated = assignSeat(doc, guestIds[0], seatIdsOf(doc, tableId)[1]);
    expect(parseEventDoc(JSON.parse(JSON.stringify(seated)))).toEqual(seated);
  });

  it("normalizes out-of-order seat indices instead of rejecting them", () => {
    const { doc } = fixture();
    const shuffled = {
      ...doc,
      tables: doc.tables.map((t) => ({
        ...t,
        seats: [...t.seats].reverse().map((s, i) => ({ ...s, index: (t.seats.length - i) * 10 })),
      })),
    };
    const parsed = parseEventDoc(shuffled);
    expect(parsed.tables[0].seats.map((s) => s.index)).toEqual([0, 1, 2, 3]);
    expect(parsed.tables[0].seats.map((s) => s.id)).toEqual(doc.tables[0].seats.map((s) => s.id));
  });

  it("refuses documents from a newer schema version", () => {
    const { doc } = fixture();
    expect(() => parseEventDoc({ ...doc, schemaVersion: EVENT_DOC_SCHEMA_VERSION + 1 })).toThrow(
      /Update the app/,
    );
  });

  it("throws EventDocError for garbage", () => {
    expect(() => parseEventDoc("hello")).toThrow(EventDocError);
    expect(() => parseEventDoc({ schemaVersion: 1 })).toThrow(EventDocError);
  });
});
