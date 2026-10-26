import { type Locator, type Page, expect } from "@playwright/test";

/** Below this width the side panels are drawers (Tailwind `xl`). */
const DESKTOP_MIN_WIDTH = 1280;

export function isTabletLayout(page: Page): boolean {
  return (page.viewportSize()?.width ?? DESKTOP_MIN_WIDTH) < DESKTOP_MIN_WIDTH;
}

/** Below Tailwind's `sm` (640px): the phone layout, with its bottom bar. */
export function isPhoneLayout(page: Page): boolean {
  return (page.viewportSize()?.width ?? DESKTOP_MIN_WIDTH) < 640;
}

/** The editor's toolbar (the top bar, or the bottom bar on phones). */
export function editorTools(page: Page): Locator {
  return page.getByRole("group", { name: "Editor tools" });
}

/** Creates an event from the dashboard and waits for the editor. */
export async function createEvent(page: Page, name: string): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "+ New event" }).click();
  await page.getByPlaceholder(/Wedding/).fill(name);
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/events\//);
  await expect(editorTools(page)).toBeVisible();
}

/** The guest panel (opening its drawer first on tablets). */
export async function guestPanel(page: Page): Promise<Locator> {
  const panel = page.getByRole("complementary", { name: "Guests" });
  if (isTabletLayout(page)) {
    const toggle = page.getByRole("button", { name: "Guests", exact: true });
    if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
  }
  await expect(panel.getByRole("heading", { name: "Guests" })).toBeInViewport();
  return panel;
}

export async function addRoundTable(page: Page): Promise<void> {
  // Phones: tables are added from the bottom bar's "+ Add ▾".
  if (isPhoneLayout(page)) await page.getByRole("button", { name: "+ Add ▾" }).click();
  await page.getByRole("button", { name: /^\+ Round/ }).click();
  // New tables are selected; deselect so the canvas goes back to the full view.
  await page.keyboard.press("Escape");
}

/** Picks a CSV in the guest panel's file input; the "Import guests" dialog opens. */
export async function openImportDialog(page: Page, csv: string): Promise<Locator> {
  const panel = await guestPanel(page);
  await panel.locator('input[type="file"]').setInputFiles({
    name: "guests.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  const dialog = page.getByRole("dialog", { name: "Import guests" });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Imports guests from CSV text through the real file input and the import
 * dialog (with its suggested column mapping). */
export async function importGuests(page: Page, csv: string): Promise<void> {
  const dialog = await openImportDialog(page, csv);
  await dialog.getByRole("button", { name: /^Import \d+ guests?$/ }).click();
  await expect(dialog).toBeHidden();
  const panel = await guestPanel(page);
  await expect(panel.getByText(/^Imported \d+ guests?/)).toBeVisible();
}

/** Ticks the select-all box in the guest list. */
export async function selectAllGuests(page: Page): Promise<void> {
  const panel = await guestPanel(page);
  // The whole cell around the box is the click target (a bigger hit area).
  await panel.getByRole("checkbox", { name: "Select all guests" }).locator("..").click();
}

/** Picks a table in the "Assign to table…" menu. */
export async function assignSelectionTo(page: Page, tableName: string): Promise<void> {
  const panel = await guestPanel(page);
  const select = panel.getByRole("combobox", { name: "Assign selected guests to a table" });
  const label = await select
    .locator("option")
    .filter({ hasText: new RegExp(`^${tableName} \\(`) })
    .textContent();
  await select.selectOption({ label: label ?? tableName });
}

/** The "Seated (n)" count from the guest list. */
export async function seatedCount(page: Page): Promise<number> {
  const panel = await guestPanel(page);
  const text = await panel.getByRole("heading", { name: /^Seated \(\d+\)$/ }).textContent();
  return Number(text?.match(/\d+/)?.[0] ?? NaN);
}

export function csvOf(names: string[]): string {
  return ["Name", ...names].join("\n") + "\n";
}

/** The "Exact seat placement" switch, in Properties (with nothing selected);
 * below xl this opens the Properties drawer first. */
export async function exactPlacementToggle(page: Page): Promise<Locator> {
  if (!isTabletLayout(page)) {
    return page
      .getByRole("complementary", { name: "Properties" })
      .getByText("Exact seat placement");
  }
  const toggle = page.getByRole("button", { name: "Properties", exact: true });
  if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
  return page.getByRole("complementary", { name: "Properties" }).getByText("Exact seat placement");
}

/** Closes an open side drawer (tablets) so the canvas and tabs are reachable. */
export async function closeDrawers(page: Page): Promise<void> {
  if (!isTabletLayout(page)) return;
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Close panel" })).toBeHidden();
}
