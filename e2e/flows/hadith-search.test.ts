import type { Locator, Page } from "@playwright/test";

import { bookName, collectionName, hadithReference, readFixture } from "../helpers/data";
import { expect, test } from "../helpers/fixtures";

const openSearch = async (page: Page) => {
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};
const result = (collection: string, book: number, id: string) =>
  `${collectionName(collection)}, ${hadithReference(collection, book, id)}`;
const allCollections = readFixture<GetHadithCollectionsResponse>("hadiths/collections").collections.map((c) => c.id);
const downloadCollections = async (dialog: Locator, collections: string[]) => {
  await expect(dialog.getByText("Download a collection to search its hadiths.")).toBeVisible();
  for (const collection of collections) {
    await dialog.getByRole("button", { name: `Download ${collectionName(collection)}`, exact: true }).click();
  }
  await expect(dialog.getByText("Download a collection to search its hadiths.")).toBeHidden();
};

test.describe("Hadith search", () => {
  test("switches from a chapter to the hadiths and finds a synonym", async ({ testPage }) => {
    await testPage.goto("/chapters/1");
    const dialog = await openSearch(testPage);
    await dialog.getByText("Hadith", { exact: true }).click();
    await downloadCollections(dialog, allCollections);
    await dialog.getByRole("searchbox", { name: "Search words" }).fill("satan");
    await expect(dialog.getByRole("article", { name: result("malik", 4, "4.1.1") })).toBeVisible();
  });

  test("forgives a typo and narrows by narrator", async ({ testPage }) => {
    await testPage.goto("/hadiths");
    await testPage.getByRole("button", { name: "Search the hadiths" }).click();
    const dialog = testPage.getByRole("dialog", { name: "Search", exact: true });
    await downloadCollections(dialog, allCollections);
    await dialog.getByRole("searchbox", { name: "Search words" }).fill("reward deeds intentons");
    await expect(dialog.getByRole("article").first()).toHaveAccessibleName(result("bukhari", 1, "1"));

    await dialog.getByRole("searchbox", { name: "Search words" }).fill("prayer");
    const narratorBox = dialog.getByRole("combobox", { name: "Narrator" });
    await narratorBox.fill("Abu Huraira");
    await expect(testPage.getByRole("option", { name: "Abu Huraira", exact: true })).toBeAttached();
    await narratorBox.press("Enter");
    const results = dialog.getByRole("article");
    await expect(results.first()).toContainText("Abu Huraira");
    for (const article of await results.all()) {
      await expect(article).toContainText("Abu Huraira");
    }
  });

  test("starts with the book of the page and opens a result", async ({ testPage }) => {
    await testPage.goto("/hadiths/bukhari/13");
    await testPage.getByRole("button", { name: "Search this book" }).click();
    const dialog = testPage.getByRole("dialog", { name: "Search", exact: true });
    await expect(dialog.getByText(`13. ${bookName("bukhari", 13)}`, { exact: true })).toBeVisible();
    await downloadCollections(dialog, ["bukhari"]);
    await dialog.getByRole("searchbox", { name: "Search words" }).fill("last to come");
    await dialog
      .getByRole("article", { name: result("bukhari", 13, "1"), exact: true })
      .getByRole("link")
      .click();
    await expect(testPage).toHaveURL(/\/hadiths\/bukhari\/13\/1$/);
    await expect(dialog).toBeHidden();
  });
});
