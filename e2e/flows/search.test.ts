import type { Page } from "@playwright/test";

import { chapterName } from "../helpers/data";
import { expect, test } from "../helpers/fixtures";
import { openSettings } from "../helpers/settings";

const openSearch = async (page: Page) => {
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe("Verse search", () => {
  test("searches the open chapter and scrolls to a verse", async ({ testPage }) => {
    await testPage.goto("/chapters/112");
    const dialog = await openSearch(testPage);

    await expect(dialog.getByRole("checkbox", { name: `Only ${chapterName(112)}`, exact: true })).toBeChecked();
    const searchbox = dialog.getByRole("searchbox", { name: "Search words", exact: true });
    await expect(searchbox).toBeFocused();
    await searchbox.fill("begotten");

    const result = dialog.getByRole("article", { name: "Verse 112:3", exact: true });
    await expect(result.getByText("begotten", { exact: true })).toBeVisible();
    await result.getByRole("link", { name: `${chapterName(112)} 112:3`, exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(testPage.getByRole("article", { name: "Verse 3", exact: true })).toBeInViewport();
  });

  test("searches the whole Qur'an once its texts are downloaded", async ({ testPage }) => {
    await testPage.goto("/");
    let dialog = await openSearch(testPage);
    await expect(
      dialog.getByText("Download a text to search it across the whole Qur'an.", { exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();

    const storage = await openSettings(testPage, "Offline Storage");
    await storage.getByRole("button", { name: "Download All", exact: true }).click();
    await expect(storage.getByText(/· Downloaded$/)).toHaveCount(4);
    await storage.getByRole("button", { name: "Close", exact: true }).click();

    dialog = await openSearch(testPage);
    await dialog.getByRole("searchbox", { name: "Search words", exact: true }).fill("mischief");

    await expect(dialog.getByRole("article", { name: "Verse 113:2", exact: true })).toBeVisible();
    // the results are virtualized, so a result further down is only rendered once in view
    await dialog.getByRole("searchbox", { name: "Search words", exact: true }).fill("mischief whisperer");
    await dialog
      .getByRole("article", { name: "Verse 114:4", exact: true })
      .getByRole("link", { name: `${chapterName(114)} 114:4`, exact: true })
      .click();

    await expect(testPage).toHaveURL(/\/chapters\/114#v-4$/);
    await expect(testPage.getByRole("article", { name: "Verse 4", exact: true })).toBeInViewport();
  });
});
