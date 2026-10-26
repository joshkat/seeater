import { expect, test } from "@playwright/test";

import {
  addRoundTable,
  assignSelectionTo,
  createEvent,
  csvOf,
  importGuests,
  selectAllGuests,
} from "./helpers";

test("undo notices have an Undo button (no ⌘Z needed)", async ({ page }) => {
  await createEvent(page, "Two rooms");
  await page.getByRole("button", { name: "+ Layout" }).click();
  const dialog = page.getByRole("dialog", { name: "New layout" });
  await dialog.getByLabel("Layout name").fill("Ceremony");
  await dialog.getByRole("button", { name: "Create layout" }).click();

  const layouts = page.getByRole("navigation", { name: "Layouts" });
  await layouts.getByRole("button", { name: "Ceremony layout actions" }).click();
  await layouts.getByRole("button", { name: "Delete layout" }).click();
  await expect(layouts.getByRole("button", { name: "Ceremony", exact: true })).toBeHidden();

  const notice = page.getByRole("status").filter({ hasText: "Deleted the “Ceremony” layout." });
  await expect(notice).not.toContainText("⌘");
  await notice.getByRole("button", { name: "Undo" }).click();
  await expect(layouts.getByRole("button", { name: "Ceremony", exact: true })).toBeVisible();
  await expect(notice).toBeHidden();
});

test("the placement dialog takes focus, keeps Tab inside and closes on Escape", async ({
  page,
}) => {
  await createEvent(page, "Focus");
  await addRoundTable(page);
  await importGuests(page, csvOf(["Ada", "Grace"]));
  await selectAllGuests(page);
  await assignSelectionTo(page, "Table 1");

  const dialog = page.getByRole("dialog", { name: "Seat placement" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
  }
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator(":focus")).toHaveCount(1);

  // Nothing picked or pending, so Escape backs out of the dialog itself.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
