import { expect, test } from "@playwright/test";

import { createEvent, csvOf, guestPanel, openImportDialog } from "./helpers";

/** One line per invitation, as some wedding sites export (UX-31). */
const PARTY_PER_ROW = [
  "Title,First Name,Last Name,Partner First Name,Partner Last Name,Type,Wedding RSVP,Street Address",
  "Ms,Dana,Hill,Lou,Hill,Primary,Attending,1 Elm St",
  "Mr,Sam,Lee,,,Primary,Declined,2 Oak Ave",
  "Dr,Ira,Moss,Jo,Park,Plus-one,,3 Pine Rd",
].join("\n");

test("partners on a party-per-row line are imported into one household", async ({ page }) => {
  await createEvent(page, "Partners");
  const dialog = await openImportDialog(page, PARTY_PER_ROW);

  await expect(dialog.getByLabel("Field for column “Partner First Name”")).toHaveValue(
    "partnerFirstName",
  );
  await expect(dialog.getByLabel("Field for column “Partner Last Name”")).toHaveValue(
    "partnerLastName",
  );
  // "Primary" / "Plus-one" isn't adult/child, so Type isn't read as Child.
  await expect(dialog.getByLabel("Field for column “Type”")).toHaveValue("ignore");
  await expect(
    dialog.getByText("3 columns won’t be imported: Title, Type, Street Address."),
  ).toBeVisible();
  await expect(dialog.getByText("guesses each column from its header")).toBeVisible();

  const preview = dialog.getByRole("table", { name: "Import preview" });
  await expect(preview.getByRole("row", { name: /Lou Hill/ })).toContainText("Partner");
  await expect(preview.getByRole("row", { name: /Lou Hill/ })).toContainText("Going");

  await dialog.getByRole("button", { name: "Import 5 guests (2 partners)" }).click();
  await expect(dialog).toBeHidden();

  const panel = await guestPanel(page);
  await expect(panel.getByText("Imported 5 guests.")).toBeVisible();
  await expect(panel.getByRole("checkbox", { name: "Select the Hill household" })).toBeAttached();
  await expect(
    panel.getByRole("checkbox", { name: "Select the Moss & Park household" }),
  ).toBeAttached();
  await expect(panel.locator("li.cursor-grab", { hasText: "Lou Hill" })).toBeVisible();
});

test("every row is previewed; duplicates are named and can be imported anyway", async ({
  page,
}) => {
  await createEvent(page, "Duplicates");
  const names = ["Ada", "Grace", "Linus", "Alan", "Hedy", "Katherine", "Sam Lee", "Barbara"];
  // Row 10 of the file (counting the header) repeats Sam Lee, past the old 5-row preview.
  const dialog = await openImportDialog(page, csvOf([...names, "sam lee"]));

  await expect(dialog.getByText("Skipping 1 likely duplicate: sam lee (row 10).")).toBeVisible();
  const preview = dialog.getByRole("table", { name: "Import preview" });
  const repeat = preview.getByRole("row", { name: /sam lee/ }).last();
  await repeat.scrollIntoViewIfNeeded();
  await expect(repeat).toContainText("Duplicate, skipped");
  await expect(dialog.getByRole("button", { name: "Import 8 guests" })).toBeVisible();

  await repeat.getByRole("button", { name: "Import anyway: sam lee" }).click();
  await expect(repeat).toContainText("Duplicate, importing");
  await expect(dialog.getByText(/^Skipping \d+ likely/)).toHaveCount(0);
  await dialog.getByRole("button", { name: "Import 9 guests" }).click();

  const panel = await guestPanel(page);
  await expect(panel.getByText("Imported 9 guests.")).toBeVisible();
  await expect(panel.getByText(/^sam lee$/i)).toHaveCount(2);
});

test("toggling the header row keeps a column picked by hand", async ({ page }) => {
  await createEvent(page, "Header toggle");
  const dialog = await openImportDialog(page, "Name,Entree\nAda,Fish\n");
  const entree = dialog.getByLabel(/^Field for column “(Entree|Column 2)”$/);
  await expect(entree).toHaveValue("meal");
  await entree.selectOption("tags");

  const header = dialog.getByRole("checkbox", { name: "First row is a header" });
  await header.uncheck();
  await expect(entree).toHaveValue("tags");
  await header.check();
  await expect(entree).toHaveValue("tags");
});
