import { describe, expect, it } from "vitest";

import { parseCsvRows } from "../lib/csv";
import { fieldForHeader } from "../lib/importFields";
import {
  type ColumnMapping,
  cleanRows,
  fileRowNumber,
  guestKey,
  ignoredColumns,
  ignoredColumnsText,
  importButtonLabel,
  mapRows,
  planImport,
  remapForHeader,
  skippedDuplicatesText,
  suggestMapping,
} from "../lib/importMapping";

const rows = (csv: string): string[][] => cleanRows(parseCsvRows(csv));

/** The party-per-row layout from the UX review (UX-31): one line per invitation. */
const PARTY_PER_ROW =
  "Title,First Name,Last Name,Partner First Name,Partner Last Name,Type,Wedding RSVP,Rehearsal Dinner RSVP,Street Address\n" +
  "Ms,Dana,Hill,Lou,Hill,Primary,Attending,Attending,1 Elm St\n" +
  "Mr,Sam,Lee,,,Primary,Declined,,2 Oak Ave\n" +
  "Dr,Ira,Moss,Jo Park,,Plus-one,,,3 Pine Rd\n";

describe("party-per-row exports (partners)", () => {
  const data = rows(PARTY_PER_ROW);
  const mapping = suggestMapping(data, true);

  it("maps partner columns, and leaves a Primary/Plus-one Type column alone", () => {
    expect(mapping).toEqual([
      "ignore",
      "firstName",
      "lastName",
      "partnerFirstName",
      "partnerLastName",
      "ignore",
      "rsvp",
      "ignore",
      "ignore",
    ]);
  });

  it.each([
    ["Partner First Name", "partnerFirstName"],
    ["Partner's Last Name", "partnerLastName"],
    ["Guest 2 First Name", "partnerFirstName"],
    ["Plus One First Name", "partnerFirstName"],
    ["Plus-One Last Name", "partnerLastName"],
    ["+1 First Name", "partnerFirstName"],
    ["Partner Name", "partnerFirstName"],
    ["Spouse Surname", "partnerLastName"],
    ["Guest First Name", "firstName"],
  ])("maps %j to %s", (header, field) => {
    expect(fieldForHeader(header)).toBe(field);
  });

  it("reads Type as Child only when its values are adult/child", () => {
    expect(fieldForHeader("Type", ["Primary", "Plus-one"])).toBeNull();
    expect(fieldForHeader("Type", ["Adult", "child", ""])).toBe("isChild");
    expect(fieldForHeader("Type")).toBeNull();
    const ages = rows("Name,Type\nAda,Adult\nTom,Child\n");
    expect(suggestMapping(ages, true)).toEqual(["name", "isChild"]);
  });

  it("imports the partner as a second guest in the same household", () => {
    const { guests } = mapRows(data, true, mapping);
    expect(
      guests.map((guest) => [guest.input.name, guest.input.household, !!guest.partner]),
    ).toEqual([
      ["Dana Hill", "Hill", false],
      ["Lou Hill", "Hill", true],
      ["Sam Lee", undefined, false],
      ["Ira Moss", "Moss & Park", false],
      ["Jo Park", "Moss & Park", true],
    ]);
    // The row's RSVP applies to both; their own details aren't on the row.
    expect(guests[1].input).toEqual({
      name: "Lou Hill",
      email: null,
      phone: null,
      household: "Hill",
      rsvpStatus: "accepted",
    });
  });

  it("joins different last names, prefers the party column, and gives a lone first name the guest's surname", () => {
    const pairs = rows(
      "First Name,Last Name,Partner First Name,Partner Last Name,Party\n" +
        "Ada,Lovelace,Charles,Babbage,\n" +
        "Grace,Hopper,Vince,,The Hoppers\n",
    );
    const { guests } = mapRows(pairs, true, suggestMapping(pairs, true));
    expect(guests.map((guest) => [guest.input.name, guest.input.household])).toEqual([
      ["Ada Lovelace", "Lovelace & Babbage"],
      ["Charles Babbage", "Lovelace & Babbage"],
      ["Grace Hopper", "The Hoppers"],
      ["Vince Hopper", "The Hoppers"],
    ]);
  });

  it("names a pair's household after both of them when there are no last names", () => {
    const named = rows("Name,Partner Name\nDana,Lou\n");
    const { guests } = mapRows(named, true, suggestMapping(named, true));
    expect(guests.map((guest) => guest.input.household)).toEqual(["Dana & Lou", "Dana & Lou"]);
  });

  it("keeps a partner whose row has no first guest", () => {
    const lone = rows("First Name,Partner First Name\n,Lou\n");
    const { guests, skipped } = mapRows(lone, true, suggestMapping(lone, true));
    expect(guests.map((guest) => guest.input.name)).toEqual(["Lou"]);
    expect(skipped).toBe(0);
  });

  it("counts partners in the plan and on the button", () => {
    const plan = planImport(data, {
      hasHeader: true,
      mapping,
      existingNames: [],
      skipDuplicates: true,
    });
    expect(plan.toImport).toHaveLength(5);
    expect(plan.partnersToImport).toBe(2);
    expect(importButtonLabel(5, 2)).toBe("Import 5 guests (2 partners)");
    expect(importButtonLabel(3, 1)).toBe("Import 3 guests (1 partner)");
    expect(importButtonLabel(1, 0)).toBe("Import 1 guest");
  });

  it("warns about non-empty columns that won't be imported", () => {
    expect(ignoredColumns(data, true, mapping)).toEqual([
      "Title",
      "Type",
      "Rehearsal Dinner RSVP",
      "Street Address",
    ]);
    expect(ignoredColumnsText(["Partner First Name", "Street Address"])).toBe(
      "2 columns won’t be imported: Partner First Name, Street Address.",
    );
    expect(ignoredColumnsText(["Title"])).toBe("1 column won’t be imported: Title.");
    expect(ignoredColumnsText([])).toBe("");
    // Empty columns don't count.
    expect(ignoredColumns(rows("Name,Notes\nAda,\n"), true, ["name", "ignore"])).toEqual([]);
  });
});

describe("duplicates in place (Known-4, UX-32)", () => {
  const data = rows("Name\nAda\nSam Lee\nGrace\nsam lee\n");
  const base = {
    hasHeader: true,
    mapping: ["name"] as ColumnMapping,
    existingNames: ["Grace"],
  };

  it("names the skipped duplicates with their file row", () => {
    const plan = planImport(data, { ...base, skipDuplicates: true });
    expect(plan.excluded).toEqual([false, false, true, true]);
    expect(plan.skippedDuplicates).toEqual([
      { name: "Grace", fileRow: 4 },
      { name: "sam lee", fileRow: 5 },
    ]);
    expect(skippedDuplicatesText(plan.skippedDuplicates)).toBe(
      "Skipping 2 likely duplicates: Grace (row 4), sam lee (row 5).",
    );
  });

  it("imports a duplicate anyway when asked", () => {
    const plan = planImport(data, {
      ...base,
      skipDuplicates: true,
      importAnyway: new Set([guestKey({ input: { name: "sam lee" }, row: 3 })]),
    });
    expect(plan.excluded).toEqual([false, false, true, false]);
    expect(plan.toImport.map((guest) => guest.name)).toEqual(["Ada", "Sam Lee", "sam lee"]);
    expect(plan.skippedDuplicates).toEqual([{ name: "Grace", fileRow: 4 }]);
  });

  it("excludes nothing when duplicates aren't skipped", () => {
    const plan = planImport(data, { ...base, skipDuplicates: false });
    expect(plan.excluded).toEqual([false, false, false, false]);
    expect(plan.skippedDuplicates).toEqual([]);
  });

  it("lists at most five names", () => {
    const many = Array.from({ length: 7 }, (_, index) => ({ name: `G${index}`, fileRow: index }));
    expect(skippedDuplicatesText(many)).toBe(
      "Skipping 7 likely duplicates: G0 (row 0), G1 (row 1), G2 (row 2), G3 (row 3), G4 (row 4) and 2 more.",
    );
    expect(skippedDuplicatesText([{ name: "Sam Lee", fileRow: 9 }])).toBe(
      "Skipping 1 likely duplicate: Sam Lee (row 9).",
    );
    expect(skippedDuplicatesText([])).toBe("");
  });

  it("numbers rows as the file does", () => {
    expect(fileRowNumber(0, true)).toBe(2);
    expect(fileRowNumber(0, false)).toBe(1);
    expect(guestKey({ input: { name: "x" }, row: 2, partner: true })).toBe("2:partner");
  });
});

describe("remapForHeader (Known-3)", () => {
  const data = rows("Name,Entree\nAda,Fish\n");

  it("keeps hand-picked columns when the header box is toggled", () => {
    expect(suggestMapping(data, true)).toEqual(["name", "meal"]);
    const edited: ColumnMapping = ["name", "tags"];
    const off = remapForHeader(data, false, edited, new Set([1]));
    expect(off).toEqual(["name", "tags"]);
    expect(remapForHeader(data, true, off, new Set([1]))).toEqual(["name", "tags"]);
  });

  it("re-suggests the columns nobody touched", () => {
    expect(remapForHeader(data, false, ["name", "tags"], new Set())).toEqual(["name", "email"]);
  });
});
