import { TABLE_PRESETS, type TablePreset } from "../geometry/constants.js";
import type { Point } from "../types/geometry.js";
import { autoSeat } from "./autoSeat.js";
import { createEventDoc } from "./eventOps.js";
import { addGuests, type GuestInput, updateGuest } from "./guestOps.js";
import { addLayout, renameLayout } from "./layoutOps.js";
import { addRoomObject, updateRoomObject } from "./roomObjectOps.js";
import { addRule } from "./ruleOps.js";
import type { EventDoc, RoomObjectKind } from "./schema.js";
import { addTableFromPreset, addTableGrid, setTableLabel } from "./tableOps.js";

/**
 * Starter templates: ready-made rooms (a template is just an event with no
 * guests). Each builds its layout from the ordinary ops, so everything it
 * makes is editable like anything else. Sizes in cm.
 */

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  /** Floor size (cm). */
  floor: { width: number; height: number };
  /** Adds the room to an empty active layout. */
  build: (doc: EventDoc) => EventDoc;
}

const preset = (id: string): TablePreset => TABLE_PRESETS.find((p) => p.id === id)!;

function place(doc: EventDoc, id: string, at: Point, label = ""): EventDoc {
  const added = addTableFromPreset(doc, preset(id), at);
  return label ? setTableLabel(added.doc, added.tableId, label) : added.doc;
}

function object(
  doc: EventDoc,
  kind: RoomObjectKind,
  at: Point,
  size?: { width: number; height: number },
  label?: string,
): EventDoc {
  const added = addRoomObject(doc, kind, at);
  if (!added.objectId || (!size && !label)) return added.doc;
  return updateRoomObject(added.doc, added.objectId, { size, label });
}

function grid(
  doc: EventDoc,
  presetId: string,
  count: number,
  columns: number,
  center: Point,
): EventDoc {
  return addTableGrid(doc, { count, columns, preset: preset(presetId), center }).doc;
}

/** Chair rows either side of an aisle, facing a stage at the top. */
function ceremonyRows(
  doc: EventDoc,
  rows: number,
  perSide: number,
  top: number,
  centerX: number,
): EventDoc {
  let next = doc;
  const rowWidth = perSide * 55;
  for (let i = 0; i < rows; i += 1) {
    const y = top + i * 110;
    for (const side of [-1, 1]) {
      const added = addTableFromPreset(
        next,
        { ...preset("row-10"), seatCount: perSide, size: { width: rowWidth, height: 50 } },
        {
          x: centerX + side * (rowWidth / 2 + 90),
          y,
        },
      );
      next = setTableLabel(added.doc, added.tableId, `${side < 0 ? "Left" : "Right"} ${i + 1}`);
    }
  }
  return next;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "wedding-reception",
    name: "Wedding reception",
    description: "Head table, 10 rounds of 8, dance floor, bar, buffet and DJ — about 90 seats.",
    floor: { width: 2000, height: 1400 },
    build: (doc) => {
      let next = place(doc, "head-16", { x: 1000, y: 160 }, "Head table");
      next = object(next, "dance-floor", { x: 1000, y: 560 }, { width: 500, height: 400 });
      next = grid(next, "round-60", 10, 5, { x: 1000, y: 1060 });
      next = object(next, "bar", { x: 240, y: 560 }, { width: 80, height: 300 });
      next = object(next, "buffet", { x: 1760, y: 560 }, { width: 80, height: 400 });
      next = object(next, "dj", { x: 1000, y: 320 });
      return next;
    },
  },
  {
    id: "ceremony",
    name: "Ceremony",
    description: "Ten rows of 6 either side of an aisle, facing the altar — 120 seats.",
    floor: { width: 1400, height: 1600 },
    build: (doc) => {
      let next = object(doc, "stage", { x: 700, y: 180 }, { width: 500, height: 200 }, "Altar");
      next = ceremonyRows(next, 10, 6, 460, 700);
      return object(next, "door", { x: 700, y: 1580 }, { width: 200, height: 20 }, "Entrance");
    },
  },
  {
    id: "ceremony-and-reception",
    name: "Ceremony + reception",
    description: "Two layouts, one guest list: chair rows for the ceremony, rounds for dinner.",
    floor: { width: 2000, height: 1600 },
    build: (doc) => {
      let next = object(doc, "stage", { x: 1000, y: 180 }, { width: 500, height: 200 }, "Altar");
      next = ceremonyRows(next, 10, 6, 460, 1000);
      next = renameLayout(next, next.activeLayoutId, "Ceremony");
      next = addLayout(next, "Reception").doc;
      next = place(next, "head-16", { x: 1000, y: 160 }, "Head table");
      next = object(next, "dance-floor", { x: 1000, y: 560 }, { width: 500, height: 400 });
      return grid(next, "round-60", 12, 6, { x: 1000, y: 1150 });
    },
  },
  {
    id: "gala",
    name: "Gala dinner",
    description: "Stage, 15 rounds of 10 and two bars — 150 seats.",
    floor: { width: 2400, height: 1800 },
    build: (doc) => {
      let next = object(doc, "stage", { x: 1200, y: 200 }, { width: 800, height: 300 });
      next = grid(next, "round-72", 15, 5, { x: 1200, y: 1050 });
      next = object(next, "bar", { x: 160, y: 1050 }, { width: 80, height: 400 });
      return object(next, "bar", { x: 2240, y: 1050 }, { width: 80, height: 400 });
    },
  },
  {
    id: "dinner-party",
    name: "Dinner party",
    description: "Two 8-foot banquet tables — 16 seats.",
    floor: { width: 1000, height: 800 },
    build: (doc) => {
      const next = place(doc, "banquet-8", { x: 500, y: 260 }, "Table A");
      return place(next, "banquet-8", { x: 500, y: 540 }, "Table B");
    },
  },
  {
    id: "talk",
    name: "Talk or class",
    description: "Stage and eight rows of 10 — 80 seats.",
    floor: { width: 1400, height: 1400 },
    build: (doc) => {
      let next = object(doc, "stage", { x: 700, y: 180 }, { width: 600, height: 200 });
      for (let i = 0; i < 8; i += 1) {
        const added = addTableFromPreset(next, preset("row-10"), { x: 700, y: 480 + i * 110 });
        next = setTableLabel(added.doc, added.tableId, `Row ${i + 1}`);
      }
      return next;
    },
  },
];

export function findTemplate(templateId: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((template) => template.id === templateId);
}

/** A new event laid out from a template (no guests). */
export function createEventFromTemplate(
  template: EventTemplate,
  name: string,
  now?: string,
): EventDoc {
  const base = createEventDoc({ name, dimensions: template.floor, now });
  return template.build(base);
}

/**
 * Replaces the active layout's room (floor size, tables, room objects) with a
 * template's, keeping the guest list — guests seated in this layout become
 * unseated. One edit. Other layouts the template defines are added too.
 */
export function applyTemplate(doc: EventDoc, template: EventTemplate): EventDoc {
  const cleared: EventDoc = {
    ...doc,
    dimensions: { ...template.floor },
    tables: [],
    objects: [],
    guests: doc.guests.map((guest) => (guest.seatId ? { ...guest, seatId: null } : guest)),
  };
  return template.build(cleared);
}

// ---- Sample event -----------------------------------------------------------

const SAMPLE_FAMILIES: { name: string; members: string[]; tag: string }[] = [
  {
    name: "Lovelace",
    members: ["Ada Lovelace", "William Lovelace", "Byron Lovelace"],
    tag: "Bride's family",
  },
  { name: "Hopper", members: ["Grace Hopper", "Vincent Hopper"], tag: "Groom's family" },
  {
    name: "Turing",
    members: ["Alan Turing", "Ethel Turing", "John Turing"],
    tag: "Groom's family",
  },
  {
    name: "Curie",
    members: ["Marie Curie", "Pierre Curie", "Irène Curie", "Ève Curie"],
    tag: "Bride's family",
  },
  { name: "Franklin", members: ["Rosalind Franklin", "Colin Franklin"], tag: "Friends" },
  { name: "Noether", members: ["Emmy Noether", "Fritz Noether"], tag: "Friends" },
  { name: "Ramanujan", members: ["Srinivasa Ramanujan", "Janaki Ramanujan"], tag: "Work" },
  { name: "Lamarr", members: ["Hedy Lamarr", "Anthony Loder"], tag: "Friends" },
];

const SAMPLE_SINGLES: [string, string][] = [
  ["Katherine Johnson", "Work"],
  ["Dorothy Vaughan", "Work"],
  ["Mary Jackson", "Work"],
  ["Edsger Dijkstra", "Work"],
  ["Barbara Liskov", "Friends"],
  ["Ken Thompson", "Friends"],
  ["Margaret Hamilton", "Work"],
  ["Linus Torvalds", "Friends"],
  ["Tim Berners-Lee", "Work"],
  ["Hypatia", "Friends"],
  ["Charles Babbage", "Bride's family"],
  ["Sophie Germain", "Friends"],
  ["Nikola Tesla", "Groom's family"],
  ["Rachel Carson", "Friends"],
  ["Carl Sagan", "Work"],
  ["Chien-Shiung Wu", "Friends"],
  ["Jane Goodall", "Bride's family"],
  ["Richard Feynman", "Groom's family"],
  ["Shirley Jackson", "Work"],
  ["Mae Jemison", "Friends"],
  ["Alan Kay", "Work"],
  ["Frances Allen", "Work"],
  ["John McCarthy", "Friends"],
  ["Annie Easley", "Work"],
  ["Lise Meitner", "Bride's family"],
  ["Niels Bohr", "Groom's family"],
];

const MEALS = ["Chicken", "Fish", "Vegetarian"];

/**
 * A realistic sample wedding to explore: the reception template, 46 guests
 * in families with meals, tags and RSVPs, most of them seated, and one rule.
 */
export function createSampleEvent(now?: string): EventDoc {
  const template = findTemplate("wedding-reception")!;
  let doc = createEventFromTemplate(template, "Sample wedding", now);
  const inputs: GuestInput[] = [];
  let i = 0;
  for (const family of SAMPLE_FAMILIES) {
    for (const name of family.members) {
      inputs.push({ name, household: family.name, tags: [family.tag], meal: MEALS[i++ % 3] });
    }
  }
  for (const [name, tag] of SAMPLE_SINGLES)
    inputs.push({ name, tags: [tag], meal: MEALS[i++ % 3] });
  inputs.find((input) => input.name === "Irène Curie")!.isChild = true;
  inputs.find((input) => input.name === "Ève Curie")!.isChild = true;
  inputs.find((input) => input.name === "Ada Lovelace")!.dietary = "Nut allergy";
  inputs.find((input) => input.name === "Niels Bohr")!.accessibility = "Wheelchair — aisle seat";

  const added = addGuests(doc, inputs);
  doc = added.doc;
  const byName = new Map(doc.guests.map((guest) => [guest.name, guest.id]));
  // RSVPs: most going, a few pending, two regrets.
  doc.guests.forEach((guest, index) => {
    const status = index % 9 === 4 ? "pending" : "accepted";
    doc = updateGuest(doc, guest.id, { rsvpStatus: status });
  });
  doc = updateGuest(doc, byName.get("Carl Sagan")!, { rsvpStatus: "declined" });
  doc = updateGuest(doc, byName.get("Alan Kay")!, { rsvpStatus: "declined" });
  doc = addRule(doc, "apart", [byName.get("Linus Torvalds")!, byName.get("Ken Thompson")!]).doc;
  // Seat everyone but the last few, so there's something left to do.
  const toSeat = doc.guests.slice(0, -6).map((guest) => guest.id);
  doc = autoSeat(doc, { guestIds: toSeat, groupByTag: true }).doc;
  return doc;
}
