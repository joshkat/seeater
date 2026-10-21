import { describe, expect, it } from "vitest";

import { parseCsvRows, rowsToGuests } from "../lib/csv";
import { fieldForHeader } from "../lib/importFields";
import {
  cleanRows,
  columnLabels,
  duplicateKey,
  findDuplicates,
  importSummary,
  looksLikeHeader,
  mapRows,
  mapsAName,
  parseRsvp,
  planImport,
  previewFields,
  previewValue,
  suggestMapping,
} from "../lib/importMapping";

const rows = (csv: string): string[][] => cleanRows(parseCsvRows(csv));

describe("fieldForHeader", () => {
  it.each([
    ["Name", "name"],
    ["First Name", "firstName"],
    ["Last Name", "lastName"],
    ["Surname", "lastName"],
    ["Guest First Name", "firstName"],
    ["Email Address", "email"],
    ["Phone Number", "phone"],
    ["Mobile", "phone"],
    ["Party", "household"],
    ["Party Name", "household"],
    ["Household Name", "household"],
    ["Group", "tags"],
    ["Tags", "tags"],
    ["Meal Selection", "meal"],
    ["Entree", "meal"],
    ["Dietary Restrictions", "dietary"],
    ["Allergies", "dietary"],
    ["RSVP", "rsvp"],
    ["RSVP - Reception", "rsvp"],
    ["Attending", "rsvp"],
    ["Response", "rsvp"],
    ["Status", "rsvp"],
    ["Notes", "notes"],
    ["Age Group", "isChild"],
    ["Child", "isChild"],
    ["  first   name: ", "firstName"],
  ])("maps %j to %s", (header, field) => {
    expect(fieldForHeader(header)).toBe(field);
  });

  it("returns null for unknown or blank headers", () => {
    expect(fieldForHeader("Street Address")).toBeNull();
    expect(fieldForHeader("Table")).toBeNull();
    expect(fieldForHeader("  ")).toBeNull();
  });
});

describe("header detection and suggested mapping", () => {
  it("treats a first row naming a name column as a header", () => {
    expect(looksLikeHeader(["First Name", "Last Name"])).toBe(true);
    expect(looksLikeHeader(["Guest", "Party"])).toBe(true);
    expect(looksLikeHeader(["Ada", "ada@x.com"])).toBe(false);
    expect(looksLikeHeader(["Email", "Phone"])).toBe(false);
    expect(looksLikeHeader(undefined)).toBe(false);
  });

  it("maps recognised headers, ignores unknown ones, and lets the first duplicate win", () => {
    const data = rows(
      "First Name,Last Name,Address,Email,E-mail,RSVP\nAda,Lovelace,1 St,a@x,b@x,Yes\n",
    );
    expect(suggestMapping(data, true)).toEqual([
      "firstName",
      "lastName",
      "ignore",
      "email",
      "ignore",
      "rsvp",
    ]);
  });

  it("reads headerless columns as name, email, phone", () => {
    const data = rows("Ada,ada@x.com,555,vegetarian\n");
    expect(suggestMapping(data, false)).toEqual(["name", "email", "phone", "ignore"]);
  });

  it("labels columns from the header or by number", () => {
    const data = rows("Name,,Email\nAda,x,ada@x.com,extra\n");
    expect(columnLabels(data, true)).toEqual(["Name", "Column 2", "Email", "Column 4"]);
    expect(columnLabels(data, false)).toEqual(["Column 1", "Column 2", "Column 3", "Column 4"]);
  });

  it("drops blank rows", () => {
    expect(cleanRows([["", " "], ["Ada"], []])).toEqual([["Ada"]]);
  });
});

describe("parseRsvp", () => {
  it.each(["Yes", "y", "Attending", "accepted", "Joyfully accepts", "Going", "Confirmed", "x"])(
    "reads %j as accepted",
    (value) => expect(parseRsvp(value)).toBe("accepted"),
  );
  it.each(["No", "n", "Declined", "Regrets", "Not attending", "Will not attend", "Can't make it"])(
    "reads %j as declined",
    (value) => expect(parseRsvp(value)).toBe("declined"),
  );
  it.each(["", "Pending", "Maybe", "No response", "Not confirmed", "Unconfirmed", "Awaiting"])(
    "reads %j as pending",
    (value) => expect(parseRsvp(value)).toBe("pending"),
  );
});

describe("mapRows", () => {
  it("joins first and last name when there is no Name column", () => {
    const data = rows("First Name,Last Name,Notes\nAda,Lovelace,\n,Hopper,\nLinus,,\n,,no name\n");
    const result = mapRows(data, true, suggestMapping(data, true));
    expect(result.guests.map((guest) => guest.input.name)).toEqual([
      "Ada Lovelace",
      "Hopper",
      "Linus",
    ]);
    expect(result.guests.map((guest) => guest.row)).toEqual([0, 1, 2]);
    expect(result.skipped).toBe(1);
  });

  it("prefers a filled Name column over first/last name", () => {
    const data = rows("Name,First,Last\nThe Lovelaces,Ada,Lovelace\n,Grace,Hopper\n");
    const result = mapRows(data, true, ["name", "firstName", "lastName"]);
    expect(result.guests.map((guest) => guest.input.name)).toEqual([
      "The Lovelaces",
      "Grace Hopper",
    ]);
  });

  it("reads RSVP only when an RSVP column is mapped", () => {
    const data = rows("Name,RSVP\nAda,Yes\nGrace,No\nLinus,\n");
    const mapped = mapRows(data, true, ["name", "rsvp"]);
    expect(mapped.guests.map((guest) => guest.input.rsvpStatus)).toEqual([
      "accepted",
      "declined",
      "pending",
    ]);
    const ignored = mapRows(data, true, ["name", "ignore"]);
    expect(ignored.guests[0].input).toEqual({ name: "Ada", email: null, phone: null });
  });

  it("combines several columns mapped to one field", () => {
    const data = rows(
      "Name,Tags,Group,Notes,Comments,Email,Email 2\nAda,VIP,Family; Work,Speech,Late,,a@x\n",
    );
    const result = mapRows(data, true, [
      "name",
      "tags",
      "tags",
      "notes",
      "notes",
      "email",
      "email",
    ]);
    expect(result.guests[0].input).toEqual({
      name: "Ada",
      email: "a@x",
      phone: null,
      tags: ["VIP", "Family", "Work"],
      notes: "Speech; Late",
    });
  });

  it("reads detail columns and child flags", () => {
    const data = rows(
      "Name,Party,Meal,Dietary,Accessibility,Age Group\nTom,Smith,Kids menu,Nuts,Ramp,Child\nAnn,Smith,Fish,,,Adult\n",
    );
    const result = mapRows(data, true, suggestMapping(data, true));
    expect(result.guests.map((guest) => guest.input)).toEqual([
      {
        name: "Tom",
        email: null,
        phone: null,
        household: "Smith",
        meal: "Kids menu",
        dietary: "Nuts",
        accessibility: "Ramp",
        isChild: true,
      },
      { name: "Ann", email: null, phone: null, household: "Smith", meal: "Fish" },
    ]);
  });

  it("uses every row when the first row isn't a header", () => {
    const data = rows("Ada,ada@x\nGrace,\n");
    const result = mapRows(data, false, suggestMapping(data, false));
    expect(result.guests.map((guest) => guest.input.name)).toEqual(["Ada", "Grace"]);
  });

  it("collapses whitespace in joined names", () => {
    const data = rows("First Name,Last Name\n  Ada   May , Lovelace \n");
    expect(mapRows(data, true, ["firstName", "lastName"]).guests[0].input.name).toBe(
      "Ada May Lovelace",
    );
  });
});

describe("duplicates", () => {
  it("compares names case-insensitively with whitespace collapsed", () => {
    expect(duplicateKey("  Ada   LOVELACE ")).toBe("ada lovelace");
  });

  it("flags matches with existing guests and repeats within the file", () => {
    const flags = findDuplicates(
      [{ name: "ada lovelace" }, { name: "Grace" }, { name: "GRACE" }, { name: "Linus" }],
      ["Ada  Lovelace"],
    );
    expect(flags).toEqual(["existing", null, "file", null]);
  });
});

describe("planImport", () => {
  const data = rows(
    "First Name,Last Name,RSVP\nAda,Lovelace,Yes\nGrace,Hopper,No\nada,lovelace,\n",
  );
  const base = { hasHeader: true, mapping: suggestMapping(data, true) };

  it("counts duplicates and leaves them out when skipping", () => {
    const plan = planImport(data, {
      ...base,
      existingNames: ["Grace Hopper"],
      skipDuplicates: true,
    });
    expect(plan.existingDuplicates).toBe(1);
    expect(plan.fileDuplicates).toBe(1);
    expect(plan.duplicates).toEqual([null, "existing", "file"]);
    expect(plan.toImport).toEqual([
      { name: "Ada Lovelace", email: null, phone: null, rsvpStatus: "accepted" },
    ]);
  });

  it("keeps duplicates when not skipping", () => {
    const plan = planImport(data, {
      ...base,
      existingNames: ["Grace Hopper"],
      skipDuplicates: false,
    });
    expect(plan.toImport.map((guest) => guest.name)).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
      "ada lovelace",
    ]);
  });
});

describe("mapping helpers", () => {
  it("knows whether a mapping names guests", () => {
    expect(mapsAName(["ignore", "email"])).toBe(false);
    expect(mapsAName(["ignore", "lastName"])).toBe(true);
  });

  it("lists preview columns in picker order", () => {
    expect(previewFields(["tags", "name", "rsvp", "ignore", "firstName", "email"])).toEqual([
      "email",
      "rsvp",
      "tags",
    ]);
  });
});

describe("previewValue and importSummary", () => {
  const guest = {
    name: "Tom",
    email: null,
    rsvpStatus: "accepted" as const,
    tags: ["Family", "VIP"],
    isChild: true,
    meal: "Kids menu",
  };

  it("formats preview cells", () => {
    expect(previewValue(guest, "name")).toBe("Tom");
    expect(previewValue(guest, "rsvp")).toBe("Going");
    expect(previewValue({ name: "X" }, "rsvp")).toBe("Pending");
    expect(previewValue(guest, "tags")).toBe("Family, VIP");
    expect(previewValue(guest, "isChild")).toBe("Yes");
    expect(previewValue(guest, "meal")).toBe("Kids menu");
    expect(previewValue(guest, "email")).toBe("");
    expect(previewValue(guest, "ignore")).toBe("");
  });

  it("summarises an import", () => {
    expect(importSummary(1, 0, 0)).toBe("Imported 1 guest.");
    expect(importSummary(3, 2, 1)).toBe(
      "Imported 3 guests (skipped 2 duplicates, 1 without a name).",
    );
    expect(importSummary(0, 1, 0)).toBe("Imported 0 guests (skipped 1 duplicate).");
  });
});

describe("rowsToGuests (no dialog)", () => {
  it("joins first and last name from a wedding-site style export", () => {
    const result = rowsToGuests(
      parseCsvRows(
        "First Name,Last Name,Email Address,Party Name,Meal Selection,Attending\n" +
          "Ada,Lovelace,ada@x.com,The Lovelaces,Fish,Accepted\n",
      ),
    );
    expect(result.guests).toEqual([
      {
        name: "Ada Lovelace",
        email: "ada@x.com",
        phone: null,
        household: "The Lovelaces",
        meal: "Fish",
        rsvpStatus: "accepted",
      },
    ]);
  });
});
