import { expect, test } from "@playwright/test";

test("check guests in at the door, by household, and add a walk-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample event" }).first().click();
  await page.waitForURL(/\/events\//);
  await page.getByRole("link", { name: "Check-in" }).click();
  await page.waitForURL(/\/check-in$/);

  const summary = page.getByText(/of \d+ arrived/);
  await expect(summary).toHaveText("0 of 44 arrived");

  await page.getByLabel("Find a guest").fill("lovelace");
  const guests = page.getByRole("list", { name: "Guests" });
  await expect(guests.getByRole("listitem")).toHaveCount(3);
  await expect(guests.getByText("Head table · seat 5")).toBeVisible();
  await guests.getByRole("button", { name: "Check in all 3" }).first().click();
  await expect(summary).toHaveText("3 of 44 arrived");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(summary).toHaveText("0 of 44 arrived");

  await page.getByLabel("Find a guest").fill("Zed Walker");
  await page.getByRole("button", { name: "Add “Zed Walker” as a walk-in" }).click();
  await page.getByRole("button", { name: "Add & check in" }).click();
  await expect(summary).toHaveText("1 of 45 arrived");
  await expect(guests.getByRole("button", { name: "Undo check-in for Zed Walker" })).toBeVisible();

  // Back in the editor, the walk-in is on the guest list (same open event).
  await page.getByRole("link", { name: "← Editor" }).click();
  await expect(page.getByRole("button", { name: /^\+ Round/ })).toBeVisible();
});
