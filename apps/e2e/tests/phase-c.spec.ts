import { expect, test } from "@playwright/test";

import {
  addRoundTable,
  assignSelectionTo,
  closeDrawers,
  createEvent,
  guestPanel,
  importGuests,
  selectAllGuests,
} from "./helpers";

const CSV = [
  "Name,Meal,Allergies,Group,Child",
  "Ada,Fish,Nuts,Family,",
  "Byron,Chicken,,Family,",
  "Grace,Fish,,Work,",
  "Tom,Kids menu,,Family,yes",
].join("\n");

async function seatEveryone(page: import("@playwright/test").Page): Promise<void> {
  await addRoundTable(page);
  await addRoundTable(page);
  await addRoundTable(page); // 3 tables: auto-fill, no placement dialog
  await importGuests(page, CSV);
  await selectAllGuests(page);
  await assignSelectionTo(page, "Table 1");
  await expect(page.getByRole("status")).toHaveText("Seated 4 guests at Table 1.");
}

test("search and filters narrow the guest list", async ({ page }) => {
  await createEvent(page, "Find");
  await seatEveryone(page);
  const panel = await guestPanel(page);
  await panel.getByLabel("Search guests").fill("family");
  await expect(panel.getByText("Showing 3 of 4")).toBeVisible();
  await panel.getByRole("button", { name: "Clear filters" }).click();
  await panel.getByRole("button", { name: "Filters" }).click();
  await panel.getByLabel("Needs").selectOption("child");
  await expect(panel.getByText("Showing 1 of 4")).toBeVisible();
});

test("stats show table fill and meal totals", async ({ page }) => {
  await createEvent(page, "Numbers");
  await seatEveryone(page);
  const panel = await guestPanel(page);
  await expect(panel.getByText(/4\s*of 4 seated/)).toBeVisible();
  await panel.getByRole("button", { name: "Stats" }).click();
  const stats = page.getByRole("dialog", { name: "Stats" });
  // Most common first.
  await expect(stats.getByText("Fish 2 · Chicken 1 · Kids menu 1")).toBeVisible();
  await expect(stats.getByRole("row", { name: /Table 1/ })).toContainText("Ada: Nuts");
});

test("chairs can be coloured by meal", async ({ page }) => {
  await createEvent(page, "Colours");
  await seatEveryone(page);
  await closeDrawers(page);
  await page.getByLabel("Colour chairs by").selectOption("meal");
  await expect(page.getByRole("list", { name: "Chair colour legend" })).toContainText("Kids menu");
});
