import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { parseGuestFile } from "../lib/spreadsheet";

/** Builds a real spreadsheet file in memory with SheetJS itself. */
function spreadsheetFile(rows: unknown[][], name: string, bookType: XLSX.BookType): File {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Guests");
  const bytes = XLSX.write(workbook, { type: "array", bookType }) as ArrayBuffer;
  return new File([bytes], name);
}

const ROWS = [
  ["Name", "Email", "Phone"],
  ["Ada Lovelace", "ada@example.com", 5550100],
  ["", "no-name@example.com", ""],
  ["Grace Hopper", "", ""],
];

describe("parseGuestFile", () => {
  it.each([
    ["guests.xlsx", "xlsx"],
    ["guests.xls", "biff8"],
  ] as const)("reads %s with a header row", async (name, bookType) => {
    const result = await parseGuestFile(spreadsheetFile(ROWS, name, bookType));
    expect(result.skipped).toBe(1);
    expect(result.guests).toEqual([
      { name: "Ada Lovelace", email: "ada@example.com", phone: "5550100" },
      { name: "Grace Hopper", email: null, phone: null },
    ]);
  });

  it("reads CSV without SheetJS", async () => {
    const csv = new File(['name,email\n"Lovelace, Ada",ada@example.com\n'], "guests.csv");
    const result = await parseGuestFile(csv);
    expect(result.guests).toEqual([
      { name: "Lovelace, Ada", email: "ada@example.com", phone: null },
    ]);
  });

  it("reads a Household or Party column into household names", async () => {
    const csv = new File(
      ["Guest,Party,Notes\nAda,Lovelace,\nByron,lovelace,veg\nGrace,,\n"],
      "guests.csv",
    );
    const result = await parseGuestFile(csv);
    expect(result.guests).toEqual([
      { name: "Ada", email: null, phone: null, household: "Lovelace" },
      { name: "Byron", email: null, phone: null, household: "lovelace" },
      { name: "Grace", email: null, phone: null },
    ]);
  });

  it("never reads households from a headerless file", async () => {
    const csv = new File(["Ada,ada@x.com,555,vegetarian\n"], "guests.csv");
    const result = await parseGuestFile(csv);
    expect(result.guests).toEqual([{ name: "Ada", email: "ada@x.com", phone: "555" }]);
  });
});
