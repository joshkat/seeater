import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample event" }).first().click();
  await page.waitForURL(/\/events\//);
});

test("the editor fits a phone: compact toolbar, readable guest rows", async ({ page }) => {
  // Nothing in the header or toolbar runs off the right edge.
  const width = page.viewportSize()!.width;
  for (const name of ["Check-in", "Properties", "Theme", "+ Tables ▾"]) {
    const role = name === "Check-in" ? "link" : "button";
    const box = await page.getByRole(role, { name, exact: true }).boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.x + box!.width, name).toBeLessThanOrEqual(width);
  }

  await page.getByRole("button", { name: "Guests", exact: true }).click();
  const panel = page.getByRole("complementary", { name: "Guests" });
  const name = panel.getByText("Annie Easley", { exact: true });
  await name.scrollIntoViewIfNeeded();
  await expect(name).toBeVisible();
  expect((await name.boundingBox())!.width).toBeGreaterThan(40);
  await page.keyboard.press("Escape");

  // Exact seat placement lives in Properties on phones.
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Properties" }).getByText("Exact seat placement"),
  ).toBeVisible();
});

test("check-in works on a phone", async ({ page }) => {
  await page.getByRole("link", { name: "Check-in" }).click();
  await page.getByLabel("Find a guest").fill("curie");
  await page.getByRole("button", { name: "Check in all 4" }).first().tap();
  await expect(page.getByText(/of \d+ arrived/)).toHaveText("4 of 44 arrived");
});
