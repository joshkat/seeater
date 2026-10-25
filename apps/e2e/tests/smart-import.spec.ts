import { expect, test } from "@playwright/test";

import { createEvent, csvOf, guestPanel, importGuests, openImportDialog } from "./helpers";

const WEDDING_SITE_CSV = [
  "First Name,Last Name,RSVP",
  "Ada,Lovelace,Yes",
  "grace ,  HOPPER,No",
  "Linus,Torvalds,",
].join("\n");

test("a first/last name + RSVP export maps itself and skips a duplicate", async ({ page }) => {
  await createEvent(page, "Smart import");
  await importGuests(page, csvOf(["Grace Hopper"]));

  const dialog = await openImportDialog(page, WEDDING_SITE_CSV);
  await expect(dialog.getByRole("checkbox", { name: "First row is a header" })).toBeChecked();
  await expect(dialog.getByLabel("Field for column “First Name”")).toHaveValue("firstName");
  await expect(dialog.getByLabel("Field for column “Last Name”")).toHaveValue("lastName");
  await expect(dialog.getByLabel("Field for column “RSVP”")).toHaveValue("rsvp");

  const preview = dialog.getByRole("table", { name: "Import preview" });
  await expect(preview.getByRole("row", { name: /Ada Lovelace/ })).toContainText("Going");
  await expect(preview.getByRole("row", { name: /Linus Torvalds/ })).toContainText("Pending");
  await expect(preview.getByRole("row", { name: /grace HOPPER/ })).toContainText(
    "Duplicate, skipped",
  );
  await expect(dialog.getByText("1 looks like a guest you already have.")).toBeVisible();
  await expect(dialog.getByRole("checkbox", { name: "Skip likely duplicates" })).toBeChecked();

  await dialog.getByRole("button", { name: "Import 2 guests" }).click();
  await expect(dialog).toBeHidden();

  const panel = await guestPanel(page);
  await expect(panel.getByText("Imported 2 guests (skipped 1 duplicate).")).toBeVisible();
  await expect(panel.getByText(/grace hopper/i)).toHaveCount(1);
  const ada = panel.locator("li.cursor-grab", { hasText: "Ada Lovelace" });
  await expect(ada.getByTitle(/^RSVP: Going/)).toBeVisible();
  await expect(panel.locator("li.cursor-grab", { hasText: "Linus Torvalds" })).toBeVisible();
});

test("columns can be remapped by hand, and Cancel imports nothing", async ({ page }) => {
  await createEvent(page, "Manual mapping");

  const cancelled = await openImportDialog(page, "Ada,Fish\n");
  await cancelled.getByRole("button", { name: "Cancel" }).click();
  await expect(cancelled).toBeHidden();
  const panel = await guestPanel(page);
  await expect(panel.getByText("Ada", { exact: true })).toHaveCount(0);

  const dialog = await openImportDialog(page, "Ada,Fish\nGrace,Chicken\n");
  await expect(dialog.getByRole("checkbox", { name: "First row is a header" })).not.toBeChecked();
  await expect(dialog.getByLabel("Field for column “Column 2”")).toHaveValue("email");
  await dialog.getByLabel("Field for column “Column 2”").selectOption("meal");
  const preview = dialog.getByRole("table", { name: "Import preview" });
  await expect(preview.getByRole("columnheader", { name: "Meal" })).toBeVisible();
  await expect(preview.getByRole("row", { name: /Grace/ })).toContainText("Chicken");

  await dialog.getByRole("button", { name: "Import 2 guests" }).click();
  await expect(panel.getByText("Imported 2 guests.")).toBeVisible();
  await expect(panel.locator("li.cursor-grab", { hasText: "Grace" })).toContainText("Chicken");
});
