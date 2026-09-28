import type { Page } from "@playwright/test";

import { expect, test } from "../helpers/fixtures";

const firstVerse = (page: Page) => page.getByRole("article", { name: "Verse 1", exact: true });
const addButton = (page: Page) => firstVerse(page).getByRole("button", { name: "Add to favorites", exact: true });

test.describe("Favourite verses", () => {
  test("adding a favourite persists across reloads", async ({ testPage }) => {
    await testPage.goto("/quran/112");

    await addButton(testPage).click();

    const removeButton = testPage.getByRole("button", { name: "Remove from favorites", exact: true });
    await expect(removeButton).toHaveCount(1);
    await expect(firstVerse(testPage).getByRole("button", { name: "Remove from favorites" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await testPage.reload();
    await expect(removeButton).toHaveCount(1);
    await expect(firstVerse(testPage).getByRole("button", { name: "Remove from favorites" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("removing a favourite persists across reloads", async ({ testPage }) => {
    await testPage.goto("/quran/112");
    const removeButton = testPage.getByRole("button", { name: "Remove from favorites", exact: true });

    await addButton(testPage).click();
    await expect(removeButton).toHaveCount(1);

    await removeButton.click();
    await expect(removeButton).toHaveCount(0);
    await expect(addButton(testPage)).toHaveAttribute("aria-pressed", "false");

    await testPage.reload();
    await expect(addButton(testPage)).toBeVisible();
    await expect(removeButton).toHaveCount(0);
  });

  test("favourites are kept per chapter", async ({ testPage }) => {
    await testPage.goto("/quran/112");
    await addButton(testPage).click();
    await expect(testPage.getByRole("button", { name: "Remove from favorites", exact: true })).toHaveCount(1);

    await testPage.goto("/quran/114");
    await expect(addButton(testPage)).toBeVisible();
    await expect(testPage.getByRole("button", { name: "Remove from favorites", exact: true })).toHaveCount(0);
  });
});
