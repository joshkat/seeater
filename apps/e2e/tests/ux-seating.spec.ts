import { type Locator, type Page, expect, test } from "@playwright/test";

import {
  addRoundTable,
  assignSelectionTo,
  closeDrawers,
  createEvent,
  csvOf,
  guestPanel,
  importGuests,
  isTabletLayout,
  seatedCount,
  selectAllGuests,
  showGuestTab,
} from "./helpers";

/** The Properties panel (opening its drawer on tablets). */
async function properties(page: Page): Promise<Locator> {
  const panel = page.getByRole("complementary", { name: "Properties" });
  if (isTabletLayout(page)) {
    const toggle = page.getByRole("button", { name: "Properties", exact: true });
    if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
  }
  return panel;
}

/** ⌘/Ctrl+A with nothing focused: selects every table in the layout. */
async function selectAllTables(page: Page): Promise<void> {
  await closeDrawers(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("ControlOrMeta+a");
}

/** Seats guests one by one in the placement dialog (one table: exact placement is on). */
async function seatInDialog(page: Page, names: string[]): Promise<void> {
  await selectAllGuests(page);
  await assignSelectionTo(page, "Table 1");
  const dialog = page.getByRole("dialog", { name: "Seat placement" });
  for (const [index, name] of names.entries()) {
    await dialog.getByRole("button", { name: new RegExp(name) }).click();
    await dialog.getByRole("button", { name: `Seat ${index + 1}, empty` }).click();
  }
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();
}

/** The Undo button on the canvas notice that says `text`. */
function noticeUndo(page: Page, text: string | RegExp): Locator {
  return page.getByRole("status").filter({ hasText: text }).getByRole("button", { name: "Undo" });
}

test("clearing Chairs reverts; cutting chairs or deleting a table says who lost a seat", async ({
  page,
}) => {
  await createEvent(page, "Chairs");
  await addRoundTable(page);
  await importGuests(page, csvOf(["Ada", "Grace", "Linus"]));
  await seatInDialog(page, ["Ada", "Grace", "Linus"]);

  await selectAllTables(page);
  let panel = await properties(page);
  const chairs = panel.getByLabel(/^Chairs/);
  const count = await chairs.inputValue();

  // UX-10: a blank box goes back to the current count, unseating nobody.
  await chairs.fill("");
  await chairs.press("Tab");
  await expect(chairs).toHaveValue(count);
  expect(await seatedCount(page)).toBe(3);

  // UX-11: fewer chairs → a notice naming who lost a seat, with Undo.
  panel = await properties(page);
  await panel.getByLabel(/^Chairs/).fill("2");
  await panel.getByLabel(/^Chairs/).press("Enter");
  const cut = "Table 1 now has 2 chairs. 1 guest is unseated (Linus).";
  // Escape doesn't close a drawer while a field has focus.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await closeDrawers(page);
  await expect(page.getByRole("status").filter({ hasText: cut })).toBeVisible();
  await noticeUndo(page, cut).click();
  await expect.poll(() => seatedCount(page)).toBe(3);

  // Deleting the table: one step, no confirm, but it says so.
  await selectAllTables(page);
  await page.keyboard.press("Delete");
  const deleted = "Deleted Table 1. 3 guests are unseated.";
  await expect(page.getByRole("status").filter({ hasText: deleted })).toBeVisible();
  await noticeUndo(page, deleted).click();
  await expect.poll(() => seatedCount(page)).toBe(3);
});

test("swapping seats asks before splitting a household, then says where both went", async ({
  page,
}) => {
  await createEvent(page, "Swap");
  // Three tables: exact seat placement (auto) is off, so seating auto-fills.
  for (let i = 0; i < 3; i++) await addRoundTable(page);
  await importGuests(
    page,
    ["Name,Household", "Marie Curie,Curie", "Pierre Curie,Curie", "Alan Turing,"].join("\n"),
  );
  await selectAllGuests(page);
  await assignSelectionTo(page, "Table 1");
  await expect.poll(() => seatedCount(page)).toBe(3);

  const panel = await guestPanel(page);
  const tick = (name: string) =>
    panel
      .getByRole("checkbox", { name: `Select ${name}` })
      .locator("..")
      .click();
  // Everyone has a seat now, so they're on the "Seated" tab.
  await showGuestTab(page, "Seated");
  await tick("Alan Turing");
  await assignSelectionTo(page, "Table 2");
  await expect(
    page.getByRole("status").filter({ hasText: "Seated Alan Turing at Table 2" }),
  ).toBeVisible();

  await tick("Marie Curie");
  await tick("Alan Turing");
  await panel.getByRole("button", { name: "More ▾" }).click();
  await panel.getByRole("button", { name: "Swap their seats" }).click();

  const prompt = page.getByRole("dialog", { name: "Swap seats?" });
  await expect(prompt).toContainText(
    "Marie Curie is in the Curie household. Pierre Curie would end up apart.",
  );
  await prompt.getByRole("button", { name: "Swap anyway" }).click();
  const swapped =
    /^Swapped Marie Curie \(now Table 2, seat 1\) and Alan Turing \(now Table 1, seat \d\)\./;
  await expect(page.getByRole("status").filter({ hasText: swapped })).toBeVisible();
  await noticeUndo(page, swapped).click();
  await expect(page.getByRole("status")).toBeHidden();
});

test("the overflow prompt can shrink out of the way", async ({ page }) => {
  await createEvent(page, "Overflow");
  for (let i = 0; i < 3; i++) await addRoundTable(page);
  const names = Array.from({ length: 10 }, (_, i) => `Guest ${i + 1}`);
  await importGuests(page, csvOf(names));
  await selectAllGuests(page);
  await assignSelectionTo(page, "Table 1");

  const prompt = page.getByRole("dialog", { name: "Guests that didn't fit" });
  const table2 = prompt.getByRole("button", { name: /^Table 2/ });
  await expect(table2).toBeVisible();
  await prompt.getByRole("button", { name: "Hide table choices" }).click();
  await expect(table2).toBeHidden();
  await prompt.getByRole("button", { name: "Show table choices" }).click();
  // Hovering a choice shows that table on the canvas; picking it seats them.
  await table2.hover();
  await table2.click();
  await expect.poll(() => seatedCount(page)).toBe(10);
});

test("rules can be added from the Rules dialog; auto-seat says where people went", async ({
  page,
}) => {
  await createEvent(page, "Rules dialog");
  for (let i = 0; i < 3; i++) await addRoundTable(page);
  await importGuests(page, csvOf(["Ada Lovelace", "Bob Byte", "Cy Coder"]));

  let panel = await guestPanel(page);
  await panel.getByRole("button", { name: /^Rules/ }).click();
  const rules = page.getByRole("dialog", { name: "Seating rules" });
  await rules.getByRole("button", { name: "+ Keep apart" }).click();
  const picker = rules.getByRole("region", { name: "New rule: Keep apart" });
  await expect(picker.getByRole("button", { name: "Add rule" })).toBeDisabled();
  await picker.getByLabel(/Keep apart: who\?/).fill("ada");
  await picker.getByLabel(/Keep apart: who\?/).press("Enter");
  await picker.getByLabel(/Keep apart: who\?/).fill("Bob");
  await picker.getByRole("button", { name: "+ Bob Byte" }).click();
  await picker.getByRole("button", { name: "Add rule" }).click();
  await expect(rules.getByText("Ada Lovelace, Bob Byte")).toBeVisible();
  await rules.getByRole("button", { name: "Close" }).click();

  // Nobody ticked: no "Only the 0 selected" choice.
  panel = await guestPanel(page);
  await panel.getByRole("button", { name: "Auto-seat…" }).click();
  const auto = page.getByRole("dialog", { name: "Auto-seat" });
  await expect(auto.getByText(/Only the/)).toHaveCount(0);
  await auto.getByRole("button", { name: "Auto-seat", exact: true }).click();
  const seated =
    /^Auto-seated 3 guests: Ada Lovelace → Table \d, Bob Byte → Table \d, Cy Coder → Table \d\./;
  await expect(page.getByRole("status").filter({ hasText: seated })).toBeVisible();
  await closeDrawers(page);
  await noticeUndo(page, seated).click();
  await expect.poll(() => seatedCount(page)).toBe(0);
});

test("the placement dialog can bring in someone without a seat", async ({ page }) => {
  await createEvent(page, "Add in dialog");
  await addRoundTable(page);
  await importGuests(page, csvOf(["Ada", "Grace"]));

  await selectAllTables(page);
  const panel = await properties(page);
  await panel.getByRole("button", { name: "Edit seating" }).click();
  const dialog = page.getByRole("dialog", { name: "Seat placement" });
  await dialog.getByRole("button", { name: "+ Add guest…" }).click();
  await dialog.getByLabel("Add someone without a seat").fill("gra");
  await dialog.getByRole("button", { name: "+ Grace" }).click();
  await expect(dialog.getByText("To place (1)")).toBeVisible();
  // Grace is picked: the next chair tapped is hers.
  await dialog.getByRole("button", { name: "Seat 1, empty" }).click();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => seatedCount(page)).toBe(1);
});
