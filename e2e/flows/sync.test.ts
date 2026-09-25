import { readFile } from "node:fs/promises";
import type { Browser, Page } from "@playwright/test";

import { createFakeGoogle, driveFaves, routeFakeGoogle, type FakeGoogle } from "../helpers/drive";
import { expect, preparePage, test } from "../helpers/fixtures";
import { openSettings } from "../helpers/settings";

const CHAPTER = 112;

const verse = (page: Page, n: number) => page.getByRole("article", { name: `Verse ${n}`, exact: true });
const fave = (page: Page, n: number) =>
  verse(page, n).getByRole("button", { name: "Add to favorites", exact: true }).click();
const faved = (page: Page, n: number) =>
  verse(page, n).getByRole("button", { name: "Remove from favorites", exact: true });
/** The verse list is virtualized and verse 1's tafsir fills the screen, so scroll until the verse renders */
const scrollToVerse = (page: Page, n: number) =>
  expect(async () => {
    if (!(await verse(page, n).isVisible())) {
      await page.mouse.wheel(0, 600);
    }
    await expect(verse(page, n)).toBeVisible({ timeout: 500 });
  }).toPass();

const openSync = (page: Page) => openSettings(page, "Sync & Backup");

const connect = async (page: Page) => {
  const dialog = await openSync(page);
  await dialog.getByRole("link", { name: "Sync with Google Drive", exact: true }).click();
  await page.locator("html[data-hydrated='true']").waitFor({ state: "attached" });
  await expect(page).not.toHaveURL(/sync=/);
};

const expectSyncing = async (page: Page) => {
  const dialog = await openSync(page);
  await expect(dialog.getByText("Syncing as reader@example.com", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
};

const drivePage = (google: FakeGoogle) => ({
  file: (faves: string[]) => {
    google.file = {
      version: 1,
      content: JSON.stringify({
        app: "muallimlive",
        version: 2,
        faves: Object.fromEntries(faves.map((f) => [f, { updatedAt: 1 }])),
        notes: {},
      }),
    };
  },
});

/** A second device: its own context, sharing the fake Google */
const secondDevice = async (browser: Browser, google: FakeGoogle, baseURL: string) => {
  const context = await browser.newContext({ baseURL, serviceWorkers: "block" });
  const page = await context.newPage();
  await preparePage(page, context, { acceptCookieNotice: true, audioClipSeconds: 30 });
  await routeFakeGoogle(context, google);
  return page;
};

test.describe("Google Drive sync", () => {
  let google: FakeGoogle;

  test.beforeEach(async ({ context }) => {
    google = createFakeGoogle();
    await routeFakeGoogle(context, google);
  });

  test("connecting with an empty Drive uploads this device's favorites", async ({ testPage }) => {
    await testPage.goto(`/chapters/${CHAPTER}`);
    await fave(testPage, 1);

    await connect(testPage);

    await expect.poll(() => driveFaves(google)).toEqual([`${CHAPTER}:1`]);
    await expectSyncing(testPage);
  });

  test("connecting with data on both sides asks, and merging keeps both", async ({ testPage }) => {
    drivePage(google).file([`${CHAPTER}:2`]);
    await testPage.goto(`/chapters/${CHAPTER}`);
    await fave(testPage, 1);

    await connect(testPage);
    const dialog = testPage.getByRole("dialog", { name: "Combine your data?", exact: true });
    await dialog.getByRole("button", { name: "Merge", exact: true }).click();

    await expect(faved(testPage, 1)).toBeVisible();
    await scrollToVerse(testPage, 2);
    await expect(faved(testPage, 2)).toBeVisible();
    await expect.poll(() => driveFaves(google).sort()).toEqual([`${CHAPTER}:1`, `${CHAPTER}:2`]);
  });

  test("a favorite added on one device appears on another", async ({ testPage, browser, baseURL }) => {
    await testPage.goto(`/chapters/${CHAPTER}`);
    await fave(testPage, 1);
    await connect(testPage);
    await expect.poll(() => driveFaves(google)).toEqual([`${CHAPTER}:1`]);

    const other = await secondDevice(browser, google, baseURL!);
    await other.goto(`/chapters/${CHAPTER}`);
    await connect(other);
    await expect(faved(other, 1)).toBeVisible();

    await scrollToVerse(testPage, 2);
    await fave(testPage, 2);
    // synced a few seconds after the change
    await expect.poll(() => driveFaves(google), { timeout: 10_000 }).toContain(`${CHAPTER}:2`);
    await other.reload();
    await scrollToVerse(other, 2);
    await expect(faved(other, 2)).toBeVisible();
    await other.context().close();
  });

  test("an expired sign-in requires a choice", async ({ testPage }) => {
    await testPage.goto(`/chapters/${CHAPTER}`);
    await connect(testPage);
    google.tokenStatus = 401;

    await testPage.reload();
    const dialog = testPage.getByRole("dialog", { name: "Sign in to Google again", exact: true });
    await expect(dialog).toBeVisible();
    await testPage.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Stop syncing", exact: true }).click();
    await expect(dialog).toBeHidden();
    const settings = await openSync(testPage);
    await expect(settings.getByRole("link", { name: "Sync with Google Drive", exact: true })).toBeVisible();
  });

  test("an exported backup imports back", async ({ testPage }) => {
    await testPage.goto(`/chapters/${CHAPTER}`);
    await fave(testPage, 1);
    const dialog = await openSync(testPage);

    const downloading = testPage.waitForEvent("download");
    await dialog.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/^muallimlive-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const backup = await download.path();
    expect(JSON.parse(await readFile(backup, "utf8"))).toMatchObject({ app: "muallimlive", version: 2 });

    await dialog.getByRole("button", { name: "Clear this device", exact: true }).click();
    await testPage.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(faved(testPage, 1)).toHaveCount(0);

    const choosing = testPage.waitForEvent("filechooser");
    await dialog.getByRole("button", { name: "Import", exact: true }).click();
    await (await choosing).setFiles(backup);
    await expect(testPage.getByText("Imported 1 favorite and 0 notes", { exact: true })).toBeVisible();
    await expect(faved(testPage, 1)).toHaveCount(1);
  });

  test("deleting from all devices empties the other device", async ({ testPage, browser, baseURL }) => {
    await testPage.goto(`/chapters/${CHAPTER}`);
    await fave(testPage, 1);
    await connect(testPage);
    await expect.poll(() => driveFaves(google)).toEqual([`${CHAPTER}:1`]);
    const other = await secondDevice(browser, google, baseURL!);
    await other.goto(`/chapters/${CHAPTER}`);
    await connect(other);
    await expect(faved(other, 1)).toBeVisible();

    const dialog = await openSync(testPage);
    await dialog.getByRole("button", { name: "Delete from all devices", exact: true }).click();
    const confirm = testPage.getByRole("dialog", { name: "Delete from all devices?", exact: true });
    await confirm.getByRole("button", { name: "Delete from all devices", exact: true }).click();

    await expect.poll(() => driveFaves(google)).toEqual([]);
    await other.reload();
    await expect(faved(other, 1)).toHaveCount(0);
    await other.context().close();
  });
});
