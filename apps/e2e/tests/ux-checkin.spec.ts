import { type Page, expect, test } from "@playwright/test";

import { createEvent } from "./helpers";

async function openSampleCheckIn(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample event" }).first().click();
  await page.waitForURL(/\/events\//);
  await page.getByRole("link", { name: "Check-in" }).click();
  await page.waitForURL(/\/check-in$/);
}

test("a checked-in guest stays in place for a moment, with Undo (UX-41)", async ({ page }) => {
  await openSampleCheckIn(page);
  const guests = page.getByRole("list", { name: "Guests" });
  const summary = page.getByText(/of \d+ arrived/);

  await guests.getByRole("button", { name: "Check in Margaret Hamilton" }).click();
  await expect(summary).toHaveText("1 of 44 arrived");
  // Still under "Not arrived", in a success state that says where to sit.
  const row = guests.getByRole("listitem").filter({ hasText: "Margaret Hamilton:" });
  await expect(row).toContainText(/✓ Margaret Hamilton: .+, seat \d+/);
  await expect(page.getByText(/^Margaret Hamilton checked in, /)).toBeAttached();

  // Its Undo puts her back.
  await row.getByRole("button", { name: "Undo check-in for Margaret Hamilton" }).click();
  await expect(summary).toHaveText("0 of 44 arrived");
  await expect(guests.getByRole("button", { name: "Check in Margaret Hamilton" })).toBeVisible();

  // Left alone, the row leaves the "Not arrived" list after a few seconds.
  await guests.getByRole("button", { name: "Check in Margaret Hamilton" }).click();
  await expect(row).toBeVisible();
  await expect(guests.getByText("Margaret Hamilton", { exact: false })).toBeHidden({
    timeout: 8000,
  });
});

test("search finds guests who already arrived, and doesn't offer a duplicate (UX-40)", async ({
  page,
}) => {
  await openSampleCheckIn(page);
  const guests = page.getByRole("list", { name: "Guests" });
  await guests.getByRole("button", { name: "Check in Margaret Hamilton" }).click();
  await expect(guests.getByText("Margaret Hamilton", { exact: false })).toBeHidden({
    timeout: 8000,
  });

  // Still on "Not arrived": the search looks at everyone.
  await page.getByLabel("Find a guest").fill("Margaret");
  await expect(page.getByText("Searching everyone, arrived or not.")).toBeVisible();
  const row = guests.getByRole("listitem").filter({ hasText: "Margaret Hamilton" });
  await expect(row).toContainText(/✓ Arrived/);
  await expect(page.getByText(/No one on the list matches/)).toBeHidden();
  // The walk-in is only offered under the results, as "Not them?".
  await expect(page.getByText("Not them?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add “Margaret” as a walk-in" })).toBeVisible();

  await row.getByRole("button", { name: "Undo check-in for Margaret Hamilton" }).click();
  await expect(page.getByText(/of \d+ arrived/)).toHaveText("0 of 44 arrived");

  // Nobody matches: then the walk-in is the main offer.
  await page.getByLabel("Find a guest").fill("Nobody Atall");
  await expect(page.getByText("No one on the list matches “Nobody Atall”.")).toBeVisible();
  await expect(page.getByText("Not them?")).toBeHidden();
});

test("Clear all check-ins lives in the ⋯ menu and asks first (UX-42)", async ({ page }) => {
  await openSampleCheckIn(page);
  const summary = page.getByText(/of \d+ arrived/);
  await page.getByLabel("Find a guest").fill("curie");
  await page.getByRole("button", { name: "Check in all 4" }).first().click();
  await expect(summary).toHaveText("4 of 44 arrived");
  // Not under the list any more.
  await expect(page.getByRole("main").getByRole("button", { name: /Clear all/ })).toHaveCount(0);

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "More check-in actions" }).click();
  await page.getByRole("button", { name: "Clear all check-ins" }).click();
  await expect(summary).toHaveText("0 of 44 arrived");
});

test("a file that isn't a backup gets a plain explanation (UX-54)", async ({ page }) => {
  await page.goto("/");
  const messages: string[] = [];
  page.on("console", (message) => messages.push(message.text()));
  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ hello: "world" })),
  });
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("That file isn’t a seating-chart backup.");
  await expect(alert).toContainText("⋯ → Download backup");
  // The technical reason goes to the console, not the page.
  expect(messages.some((text) => text.startsWith("Backup import failed:"))).toBe(true);
  await alert.getByRole("button", { name: "Dismiss" }).click();
  await expect(alert).toBeHidden();
});

test("the template picker is one Tab stop with arrow keys (UX-70)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ New event" }).click();
  const picker = page.getByRole("radiogroup", { name: "Start from" });
  const radios = picker.getByRole("radio");
  await expect(radios.first()).toHaveAttribute("aria-checked", "true");
  await expect(picker.locator('[tabindex="0"]')).toHaveCount(1);

  await radios.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(radios.nth(1)).toBeFocused();
  await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(radios.first()).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("End");
  await expect(radios.last()).toBeFocused();
  await expect(radios.last()).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowRight");
  await expect(radios.first()).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(radios.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(radios.first()).toHaveAttribute("aria-checked", "true");
  // Tab leaves the group instead of visiting every card.
  await page.keyboard.press("Tab");
  await expect(radios.nth(1)).not.toBeFocused();
  await expect(picker.locator(":focus")).toHaveCount(0);
});

test("trashed events keep their buttons beside the text on wide screens", async ({ page }) => {
  await createEvent(page, "Wedding in the trash");
  await page.getByRole("link", { name: "← Events" }).click();
  await page.getByRole("button", { name: "Event actions" }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();
  await page.getByRole("link", { name: /Trash/ }).click();
  await expect(page.getByText("Wedding in the trash")).toBeVisible();
  const restore = (await page.getByRole("button", { name: "Restore" }).boundingBox())!;
  const name = (await page.getByText("Wedding in the trash").boundingBox())!;
  expect(restore.y).toBeLessThan(name.y + name.height);
});
