import { expect, test } from "@playwright/test";

import { addRoundTable, createEvent, guestPanel, importGuests, showGuestTab } from "./helpers";

const CSV = ["Name,Group", "Ada,Work", "Bob,Family", "Cy,Work", "Dee,Family"].join("\n");

test("auto-seat, then a keep-apart rule is flagged when broken", async ({ page }) => {
  await createEvent(page, "Rules");
  await addRoundTable(page);
  await addRoundTable(page);
  await addRoundTable(page);
  await importGuests(page, CSV);

  const panel = await guestPanel(page);
  await panel.getByRole("button", { name: "Auto-seat…" }).click();
  const auto = page.getByRole("dialog", { name: "Auto-seat" });
  await auto.getByText(/same tag together/).click();
  await auto.getByRole("button", { name: "Auto-seat", exact: true }).click();
  // The notice says where people went (first three, then a count).
  await expect(page.getByRole("status")).toContainText(/Auto-seated 4 guests: .+ and 1 more\./);

  // Ada (Work) and Cy (Work) share a table; rule: keep them apart.
  await showGuestTab(page, "Seated");
  const box = (name: string) =>
    panel.getByRole("checkbox", { name: `Select ${name}` }).locator("..");
  await (await guestPanel(page))
    .getByRole("checkbox", { name: "Select Ada" })
    .locator("..")
    .click();
  await box("Cy").click();
  await panel.getByRole("button", { name: "More ▾" }).click();
  await panel.getByRole("button", { name: "Keep apart (rule)" }).click();
  await expect(panel.getByRole("button", { name: "Rules ⚠1" })).toBeVisible();
  await expect(panel.getByText(/⚠ rule · Seat/).first()).toBeVisible();
});
