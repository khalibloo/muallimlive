import type { BrowserContext, Page } from "@playwright/test";

import { MEDIA_URI } from "../helpers/audio";
import { arabicText, chapterHeading, translationText } from "../helpers/data";
import { expect, test } from "../helpers/fixtures";
import { openSettings } from "../helpers/settings";

// Default reader settings: Yusuf Ali (22), a tafsir, Uthmani Tajweed and a transliteration (57)
const YUSUF_ALI = 22;
const SAHEEH = 20;
const CHAPTER = 114;
// The fixture chapter list only has the fixture chapters
const CHAPTER_COUNT = 4;

// The config blocks service workers so they can't cache across tests; offline reading needs the real one
test.use({ serviceWorkers: "allow" });

/** Loads the app and waits until the service worker controls the page */
const gotoControlled = async (page: Page, path: string) => {
  await page.goto(path);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
};

const downloadAllText = async (page: Page) => {
  const dialog = await openSettings(page, "Offline Storage");
  await dialog.getByRole("button", { name: "Download All", exact: true }).click();
  await expect(dialog.getByText(/· Downloaded$/)).toHaveCount(4);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
};

/** Cuts the network, and fails any recitation file request that would still reach it */
const goOffline = async (context: BrowserContext) => {
  await context.setOffline(true);
  const audioRequests: string[] = [];
  await context.unroute(`${MEDIA_URI}/**`);
  await context.route(`${MEDIA_URI}/**`, (route) => {
    audioRequests.push(route.request().url());
    return route.abort("internetdisconnected");
  });
  return audioRequests;
};

test.describe("Offline reading", () => {
  test("reads a downloaded chapter without a connection", async ({ testPage, context }) => {
    await gotoControlled(testPage, "/");
    await downloadAllText(testPage);

    await goOffline(context);
    await testPage.goto(`/chapters/${CHAPTER}`);

    await expect(testPage.getByRole("heading", { level: 1, name: chapterHeading(CHAPTER) })).toBeVisible();
    const verse = testPage.getByRole("article", { name: "Verse 1", exact: true });
    await expect(verse.getByText(translationText(CHAPTER, YUSUF_ALI, 1), { exact: true })).toBeVisible();
    await expect(verse.getByText(arabicText(CHAPTER, "uthmani_tajweed", 1))).toBeVisible();
    await expect(testPage.getByText(/hasn't been downloaded for offline use/)).toBeHidden();
  });

  test("shows the offline page for pages that aren't available offline", async ({ testPage, context }) => {
    await gotoControlled(testPage, "/");

    await goOffline(context);
    await testPage.goto("/terms");

    await expect(testPage.getByRole("heading", { level: 1, name: "You're offline" })).toBeVisible();
    await expect(testPage.getByRole("link", { name: "Go Back To Home", exact: true })).toBeVisible();
  });

  test("warns about content in the display settings that isn't downloaded", async ({ testPage, context }) => {
    await gotoControlled(testPage, `/chapters/${CHAPTER}`);
    await downloadAllText(testPage);

    // Swap Yusuf Ali for Saheeh International, which isn't downloaded. The cascader opens on the current
    // path (Translations / English); under load an option click can be dropped, so retry until selected.
    const dialog = await openSettings(testPage, "Display Settings");
    await expect(async () => {
      await dialog.getByRole("combobox", { name: "Left pane content 1", exact: true }).click();
      await testPage
        .getByRole("menuitemcheckbox", { name: "Saheeh International", exact: true })
        .click({ timeout: 2000 });
      await expect(
        dialog.getByText("Translations / English / Saheeh International", { exact: true }).first(),
      ).toBeVisible({ timeout: 1000 });
    }).toPass();
    await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();

    const notice = testPage.getByRole("alert").filter({ hasText: "Not downloaded for offline use" });
    await expect(notice).toContainText("Your display settings now show Saheeh International.");
    await notice.getByRole("button", { name: "Open Offline Storage", exact: true }).click();
    const storage = await openSettings(testPage, "Offline Storage");
    await expect(storage.getByRole("tab", { name: "Storage", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(storage.getByRole("button", { name: "Download Saheeh International", exact: true })).toBeVisible();
    await storage.getByRole("button", { name: "Close", exact: true }).click();

    await goOffline(context);
    await testPage.goto(`/chapters/${CHAPTER}`);

    await expect(testPage.getByText(/hasn't been downloaded for offline use/)).toBeVisible();
    const verse = testPage.getByRole("article", { name: "Verse 1", exact: true });
    await expect(verse.getByText(arabicText(CHAPTER, "uthmani_tajweed", 1))).toBeVisible();
    await expect(verse.getByText(translationText(CHAPTER, SAHEEH, 1), { exact: true })).toBeHidden();
  });

  test.describe("with short clips", () => {
    test.use({ audioClipSeconds: 0.5 });

    test("plays downloaded recitations without a connection", async ({ testPage, context }) => {
      await gotoControlled(testPage, "/");
      await downloadAllText(testPage);
      const dialog = await openSettings(testPage, "Offline Storage");
      await dialog.getByRole("button", { name: "Download recitation audio", exact: true }).click();
      await expect(
        dialog.getByText(`${CHAPTER_COUNT} of ${CHAPTER_COUNT} chapters downloaded for this reciter`, { exact: true }),
      ).toBeVisible();

      const audioRequests = await goOffline(context);
      await testPage.goto(`/chapters/${CHAPTER}`);
      const playVerse = testPage
        .getByRole("article", { name: "Verse 1", exact: true })
        .getByRole("button", { name: "Play verse", exact: true });
      await playVerse.click();

      // The clip plays to its end from the cache and the button resets
      await expect
        .poll(() => testPage.locator("audio").evaluate((audio: HTMLAudioElement) => audio.played.length))
        .toBeGreaterThan(0);
      await expect(playVerse).toBeVisible();
      expect(await testPage.locator("audio").evaluate((audio: HTMLAudioElement) => audio.error)).toBeNull();
      expect(audioRequests).toEqual([]);
    });
  });
});
