import { expect, test } from "@playwright/test";

import { createEvent, guestPanel } from "./helpers";

test("a new event can start from a template", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ New event" }).click();
  const dialog = page.getByRole("dialog", { name: "New event" });
  await dialog.getByLabel("Event name").fill("Gala night");
  await dialog.getByRole("radio", { name: /Gala dinner/ }).click();
  await expect(dialog.getByRole("radio", { name: /Gala dinner/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/events\//);

  // A furnished room: no empty-room hint.
  await expect(page.getByRole("button", { name: /^\+ Round/ })).toBeVisible();
  await expect(page.getByText("This room is empty")).toBeHidden();
});

test("an empty room offers a template, applied as one undoable edit", async ({ page }) => {
  await createEvent(page, "Blank start");
  await expect(page.getByText("This room is empty")).toBeVisible();
  await page.getByRole("button", { name: "Use a template…" }).click();
  const dialog = page.getByRole("dialog", { name: "Use a template" });
  await dialog.getByRole("radio", { name: /Dinner party/ }).click();
  await dialog.getByRole("button", { name: "Use template" }).click();
  await expect(page.getByText("This room is empty")).toBeHidden();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("This room is empty")).toBeVisible();
});

test("the sample event opens with guests already seated", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample event" }).first().click();
  await page.waitForURL(/\/events\//);
  const panel = await guestPanel(page);
  await expect(panel.getByText(/\d+ of 46 seated/)).toBeVisible();
});
