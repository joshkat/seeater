import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import {
  addRoundTable,
  assignSelectionTo,
  closeDrawers,
  createEvent,
  importGuests,
  selectAllGuests,
} from "./helpers";

const CSV = ["Name,Meal,Allergies", "Ada Lovelace,Fish,Nuts", "Grace Hopper,Chicken,"].join("\n");

async function seatTwo(page: import("@playwright/test").Page): Promise<void> {
  await addRoundTable(page);
  await addRoundTable(page);
  await addRoundTable(page);
  await importGuests(page, CSV);
  await selectAllGuests(page);
  await assignSelectionTo(page, "Table 1");
  await expect(page.getByRole("status")).toHaveText("Seated 2 guests at Table 1.");
  await closeDrawers(page);
}

test("print views show rosters, a find-your-seat list and cards", async ({ page }) => {
  await createEvent(page, "Print me");
  await seatTwo(page);
  await page.getByRole("button", { name: "Export ▾" }).click();
  await page.getByRole("button", { name: "Table rosters…" }).click();

  const view = page.getByRole("dialog", { name: "Print" });
  await expect(view.getByRole("heading", { name: "Table 1 (2)" })).toBeVisible();
  await expect(view.getByText("Nuts")).toBeVisible();

  await view.getByRole("tab", { name: "Find your seat" }).click();
  await expect(view.getByRole("listitem").first()).toContainText("Hopper, Grace");

  await view.getByRole("tab", { name: "Seating chart" }).click();
  await expect(view.getByRole("img", { name: /Seating chart/ })).toBeVisible();

  await view.getByRole("button", { name: "Close" }).click();
  await expect(view).toBeHidden();
});

test("the guest list downloads as CSV with seats", async ({ page }) => {
  await createEvent(page, "Spreadsheet");
  await seatTwo(page);
  await page.getByRole("button", { name: "Export ▾" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Guest list (CSV)" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("Spreadsheet-guests.csv");
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain("Ada Lovelace,,,Pending,,Fish,Nuts,,,,,Table 1,1");
});
