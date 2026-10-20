import { expect, test } from "@playwright/test";

import { addRoundTable, createEvent, csvOf, importGuests } from "./helpers";

test("moving an event to the trash can be undone or restored later", async ({ page }) => {
  await createEvent(page, "Wedding");
  await page.getByRole("link", { name: "← Events" }).click();

  const card = page.getByRole("button", { name: /Wedding/ });
  await page.getByRole("button", { name: "Event actions" }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();
  await expect(card).toBeHidden();

  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(card).toBeVisible();

  await page.getByRole("button", { name: "Event actions" }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();
  await page.getByRole("link", { name: /Trash/ }).click();
  await expect(page.getByText("Deleted for good in 30 days")).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("The trash is empty.")).toBeVisible();
  await page.getByRole("link", { name: "← Events" }).click();
  await expect(card).toBeVisible();
});

test("a saved version can be restored", async ({ page }) => {
  await createEvent(page, "Versions");
  await addRoundTable(page);

  await page.getByRole("button", { name: "History" }).click();
  const history = page.getByRole("dialog", { name: "Version history" });
  await history.getByLabel("Version name").fill("One table");
  await history.getByRole("button", { name: "Save version" }).click();
  await expect(history.getByText("One table")).toBeVisible();
  await history.getByRole("button", { name: "Close" }).click();

  await importGuests(page, csvOf(["Ada", "Grace"]));

  await page.getByRole("button", { name: "History" }).click();
  await history
    .getByRole("listitem")
    .filter({ hasText: "One table" })
    .getByRole("button", { name: "Restore" })
    .click();
  await expect(page.getByRole("status")).toContainText("Restored “One table”");

  await page.getByRole("button", { name: "History" }).click();
  await expect(history.getByText("Before restoring “One table”")).toBeVisible();
});
