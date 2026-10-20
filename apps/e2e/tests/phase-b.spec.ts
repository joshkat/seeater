import { expect, test } from "@playwright/test";

import {
  addRoundTable,
  closeDrawers,
  createEvent,
  csvOf,
  guestPanel,
  importGuests,
  seatedCount,
} from "./helpers";

test("guest details are saved and shown under the guest", async ({ page }) => {
  await createEvent(page, "Details");
  await importGuests(page, csvOf(["Ada Lovelace"]));
  const panel = await guestPanel(page);
  await panel.getByRole("button", { name: "Details for Ada Lovelace" }).click();

  const dialog = page.getByRole("dialog", { name: "Guest details" });
  await dialog.getByLabel("Meal").fill("Fish");
  await dialog.getByLabel("Dietary needs & allergies").fill("Shellfish");
  await dialog.getByLabel("Add a tag").fill("Family");
  await dialog.getByLabel("Add a tag").press("Enter");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect((await guestPanel(page)).getByText("Fish · ⚠ Shellfish")).toBeVisible();
});

test("layouts keep their own tables and seating", async ({ page }) => {
  await createEvent(page, "Two rooms");
  await addRoundTable(page);
  await page.getByRole("button", { name: "+ Layout" }).click();
  const dialog = page.getByRole("dialog", { name: "New layout" });
  await dialog.getByLabel("Layout name").fill("Ceremony");
  await dialog.getByRole("button", { name: "Create layout" }).click();

  const layouts = page.getByRole("navigation", { name: "Layouts" });
  await expect(layouts.getByRole("button", { name: "Ceremony", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await importGuests(page, csvOf(["Ada"]));
  expect(await seatedCount(page)).toBe(0);

  await closeDrawers(page);
  await layouts.getByRole("button", { name: "Main", exact: true }).click();
  await expect(layouts.getByRole("button", { name: "Main", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  // The guest list is shared: Ada exists here too.
  await expect((await guestPanel(page)).getByText("Ada", { exact: true })).toBeVisible();
});
