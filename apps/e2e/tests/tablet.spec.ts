import { expect, test } from "@playwright/test";

import {
  addRoundTable,
  createEvent,
  csvOf,
  exactPlacementToggle,
  guestPanel,
  importGuests,
  isTabletLayout,
  seatedCount,
} from "./helpers";

test.beforeEach(({ page }) => {
  test.skip(!isTabletLayout(page), "tablet layout only");
});

test("side panels are drawers opened from the toolbar", async ({ page }) => {
  await createEvent(page, "Tablet");
  const guests = page.getByRole("complementary", { name: "Guests" });
  await expect(guests).not.toBeInViewport();

  await page.getByRole("button", { name: "Guests", exact: true }).click();
  await expect(guests).toBeInViewport();
  // Tap the dimmed canvas beside the drawer (the backdrop's centre is under it).
  const backdrop = page.getByRole("button", { name: "Close panel" });
  const box = await backdrop.boundingBox();
  await backdrop.click({ position: { x: (box?.width ?? 0) - 20, y: (box?.height ?? 0) / 2 } });
  await expect(guests).not.toBeInViewport();

  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Properties" })).toBeInViewport();
});

test("press, hold and drag a guest onto a table by touch", async ({ page }) => {
  await createEvent(page, "Touch drag");
  await addRoundTable(page);
  await importGuests(page, csvOf(["Ada"]));
  // Turn exact placement off so a single drop seats directly.
  await (await exactPlacementToggle(page)).click();

  const panel = await guestPanel(page);
  const row = panel.locator("li.cursor-grab", { hasText: "Ada" });
  await row.scrollIntoViewIfNeeded();
  const from = await row.boundingBox();
  const canvas = await page.locator('[data-drop-zone="canvas"]').boundingBox();
  if (!from || !canvas) throw new Error("layout not ready");
  const start = { x: from.x + 60, y: from.y + from.height / 2 };
  const end = { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 };

  // Playwright's touchscreen can only tap, so dispatch the touch pointer
  // events the app listens for: hold 400 ms (> the 350 ms long-press), move, lift.
  await page.evaluate(
    async ({ start, end }) => {
      const at = (x: number, y: number) => ({
        bubbles: true,
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        clientX: x,
        clientY: y,
      });
      const source = document.elementFromPoint(start.x, start.y)!;
      source.dispatchEvent(new PointerEvent("pointerdown", at(start.x, start.y)));
      await new Promise((resolve) => setTimeout(resolve, 400));
      for (let step = 1; step <= 5; step += 1) {
        const x = start.x + ((end.x - start.x) * step) / 5;
        const y = start.y + ((end.y - start.y) * step) / 5;
        window.dispatchEvent(new PointerEvent("pointermove", at(x, y)));
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      // A finger rests a moment before lifting.
      await new Promise((resolve) => setTimeout(resolve, 150));
      window.dispatchEvent(new PointerEvent("pointerup", at(end.x, end.y)));
    },
    { start, end },
  );

  await expect(page.getByRole("status")).toHaveText("Seated 1 guest at Table 1.");
  expect(await seatedCount(page)).toBe(1);
});

test("buttons are at least 44px on a touch screen", async ({ page }) => {
  await createEvent(page, "Targets");
  const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  test.skip(!coarse, "this browser doesn't report a coarse pointer");
  for (const name of ["Undo", "Zoom in", "Guests"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box?.height, name).toBeGreaterThanOrEqual(44);
  }
});
