import { expect, test } from "../helpers/fixtures";
import { openSettings } from "../helpers/settings";

const WIDTH = 360;

test.describe("On a phone", () => {
  // isMobile gives overlay scrollbars, like a phone's, which take no width
  test.use({ viewport: { width: WIDTH, height: 740 }, isMobile: true, hasTouch: true });

  test("no page scrolls sideways", async ({ testPage }) => {
    for (const path of [
      "/",
      "/quran",
      "/quran/2",
      "/hadiths",
      "/hadiths/bukhari",
      "/hadiths/bukhari/1",
      "/saved",
      "/terms",
    ]) {
      await testPage.goto(path);
      await expect
        .poll(() => testPage.evaluate(() => document.documentElement.scrollWidth), { message: path })
        .toBeLessThanOrEqual(WIDTH);
    }
  });

  test("the settings dialog shows every tab", async ({ testPage }) => {
    await testPage.goto("/quran/1");

    const dialog = await openSettings(testPage, "Display Settings");
    for (const name of ["Display", "Tajweed", "Storage", "Sync"]) {
      await expect(dialog.getByRole("tab", { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
  });

  test("the chapters drawer closes when tapping beside it", async ({ testPage }) => {
    await testPage.goto("/quran/1");
    await testPage.getByRole("button", { name: "Chapters", exact: true }).click();
    const chaptersNav = testPage.getByRole("navigation", { name: "Chapters", exact: true });
    await expect(chaptersNav).toBeVisible();

    await testPage.mouse.click(WIDTH - 8, 400);

    await expect(chaptersNav).toBeHidden();
  });

  test("the hadith filter keeps its room beside the search button", async ({ testPage }) => {
    await testPage.goto("/hadiths/bukhari/1");

    const filter = testPage.getByRole("searchbox", { name: "Filter by number or narrator", exact: true });
    const box = await filter.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(192);
  });
});
