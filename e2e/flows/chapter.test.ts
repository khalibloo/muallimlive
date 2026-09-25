import { expect, test } from "../helpers/fixtures";
import { arabicText, chapterHeading, chapterName, tafsirExcerpt, translationText } from "../helpers/data";

// Default reader settings (src/utils/config.ts): Yusuf Ali translation (22) and tafsir (0) on the left,
// Uthmani Tajweed Arabic and transliteration (57) on the right
test.describe("Reading a chapter", () => {
  test("shows the chapter heading and page title", async ({ testPage }) => {
    await testPage.goto("/chapters/1");

    await expect(testPage).toHaveTitle(`${chapterName(1)} | MuallimLive`);
    await expect(testPage.getByRole("heading", { level: 1, name: chapterHeading(1), exact: true })).toBeVisible();
  });

  test("shows the verse in every configured content type", async ({ testPage }) => {
    await testPage.goto("/chapters/1");

    await expect(testPage.getByText(translationText(1, 22, 1), { exact: true })).toBeVisible();
    await expect(testPage.getByText(translationText(1, 57, 1), { exact: true })).toBeVisible();
    // Substring match: the text content also holds the CSS-hidden verse-end marker
    await expect(testPage.getByText(arabicText(1, "uthmani_tajweed", 1))).toBeVisible();
    await expect(testPage.getByText(tafsirExcerpt(1, 0, 1))).toBeVisible();
  });

  test("renders later verses when scrolled to the end", async ({ testPage }) => {
    await testPage.goto("/chapters/112");
    const lastVerse = testPage.getByText(translationText(112, 22, 4), { exact: true });
    const lastVerseArabic = testPage.getByText(arabicText(112, "uthmani_tajweed", 4));

    // The verse list is virtualized, so the last verse only renders once it is scrolled into range.
    // The list re-measures its items while scrolling, which can move the page again, so keep scrolling
    // until the whole verse is in view.
    await expect(async () => {
      await testPage.keyboard.press("End");
      await expect(lastVerse).toBeVisible({ timeout: 1000 });
      await expect(lastVerseArabic).toBeVisible({ timeout: 1000 });
    }).toPass();
  });

  test("navigates to another chapter from the chapters drawer", async ({ testPage }) => {
    await testPage.goto("/chapters/1");

    await testPage.getByRole("button", { name: "Chapters", exact: true }).click();
    const chaptersNav = testPage.getByRole("navigation", { name: "Chapters", exact: true });
    await expect(chaptersNav).toBeVisible();
    await chaptersNav.getByRole("link", { name: `112 ${chapterName(112)}`, exact: true }).click();

    await expect(testPage).toHaveURL("/chapters/112");
    await expect(testPage.getByRole("heading", { level: 1, name: chapterHeading(112), exact: true })).toBeVisible();
    await expect(testPage.getByText(translationText(112, 22, 1), { exact: true })).toBeVisible();
    await expect(chaptersNav).toBeHidden();
  });
});
