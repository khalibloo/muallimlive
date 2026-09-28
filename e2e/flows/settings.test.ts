import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../helpers/fixtures";
import { translationText } from "../helpers/data";
import { openSettings } from "../helpers/settings";

// Chapter 114's translations are plain text (some others embed footnote markup)
const CHAPTER = 114;
const YUSUF_ALI = 22;
const TRANSLITERATION = 57;
const SAHEEH = 20;

const openDisplaySettings = (page: Page) => openSettings(page, "Display Settings");

const saveSettings = async (page: Page, dialog: Locator) => {
  await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Changes Saved Successfully" })).toBeVisible();
  await expect(dialog).toBeHidden();
  // The settings popups can scroll the page behind the dialog, and the verse list is virtualized,
  // so go back to the first verse, which the tests check
  await page.keyboard.press("Home");
};

const splitViewSwitch = (dialog: Locator) => dialog.getByRole("switch", { name: "Use Split View", exact: true });

test.describe("Display settings", () => {
  test("shows the current layout", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);

    const dialog = await openDisplaySettings(testPage);

    await expect(dialog.getByRole("tab", { name: "Display", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(splitViewSwitch(dialog)).toBeChecked();
    await expect(dialog.getByText("Left Pane", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Right Pane", { exact: true })).toBeVisible();
    for (const name of ["Left pane content 1", "Left pane content 2", "Right pane content 1", "Right pane content 2"]) {
      await expect(dialog.getByRole("combobox", { name, exact: true })).toBeVisible();
    }
  });

  test("removing a content type hides it and persists", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);
    const transliteration = testPage.getByText(translationText(CHAPTER, TRANSLITERATION, 1), { exact: true });
    await expect(transliteration).toBeVisible();

    const dialog = await openDisplaySettings(testPage);
    await dialog.getByRole("button", { name: "Remove right pane content 2", exact: true }).click();
    await expect(dialog.getByRole("combobox", { name: "Right pane content 2", exact: true })).toBeHidden();
    await saveSettings(testPage, dialog);

    await expect(transliteration).toBeHidden();
    await expect(testPage.getByText(translationText(CHAPTER, YUSUF_ALI, 1), { exact: true })).toBeVisible();

    await testPage.reload();
    await expect(testPage.getByText(translationText(CHAPTER, YUSUF_ALI, 1), { exact: true })).toBeVisible();
    await expect(transliteration).toBeHidden();
    const reopened = await openDisplaySettings(testPage);
    await expect(reopened.getByRole("combobox", { name: "Right pane content 1", exact: true })).toBeVisible();
    await expect(reopened.getByRole("combobox", { name: "Right pane content 2", exact: true })).toBeHidden();
  });

  test("changing a translation updates the verses and persists", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);
    const yusufAli = testPage.getByText(translationText(CHAPTER, YUSUF_ALI, 1), { exact: true });
    const saheeh = testPage.getByText(translationText(CHAPTER, SAHEEH, 1), { exact: true });
    await expect(yusufAli).toBeVisible();

    const dialog = await openDisplaySettings(testPage);
    // The cascader opens on the current path (Translations / English), so the sibling translation is listed.
    // Under load an option click can land before the popup settles and be dropped, so retry until it is selected.
    await expect(async () => {
      await dialog.getByRole("combobox", { name: "Left pane content 1", exact: true }).click();
      await testPage
        .getByRole("menuitemcheckbox", { name: "Saheeh International", exact: true })
        .click({ timeout: 2000 });
      await expect(
        dialog.getByText("Translations / English / Saheeh International", { exact: true }).first(),
      ).toBeVisible({ timeout: 1000 });
    }).toPass();
    await saveSettings(testPage, dialog);

    await expect(saheeh).toBeVisible();
    await expect(yusufAli).toBeHidden();

    await testPage.reload();
    await expect(saheeh).toBeVisible();
    await expect(yusufAli).toBeHidden();
  });

  test("turning split view off merges the panes and persists", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);

    const dialog = await openDisplaySettings(testPage);
    await splitViewSwitch(dialog).click();
    await expect(splitViewSwitch(dialog)).not.toBeChecked();
    await expect(dialog.getByText("Right Pane", { exact: true })).toBeHidden();
    await saveSettings(testPage, dialog);

    // All four content types are still shown, now in a single pane
    await expect(testPage.getByText(translationText(CHAPTER, YUSUF_ALI, 1), { exact: true })).toBeVisible();
    await expect(testPage.getByText(translationText(CHAPTER, TRANSLITERATION, 1), { exact: true })).toBeVisible();

    await testPage.reload();
    const reopened = await openDisplaySettings(testPage);
    await expect(splitViewSwitch(reopened)).not.toBeChecked();
    for (const name of ["Left pane content 1", "Left pane content 2", "Left pane content 3", "Left pane content 4"]) {
      await expect(reopened.getByRole("combobox", { name, exact: true })).toBeVisible();
    }
    await expect(reopened.getByRole("combobox", { name: "Right pane content 1", exact: true })).toBeHidden();
  });

  test("an empty content row must be filled in before saving", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);

    const dialog = await openDisplaySettings(testPage);
    await dialog.getByRole("button", { name: "Add left pane content", exact: true }).click();
    await expect(dialog.getByRole("combobox", { name: "Left pane content 3", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();

    await expect(dialog.getByText("Please select content", { exact: true })).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(testPage.getByRole("alert").filter({ hasText: "Changes Saved Successfully" })).toBeHidden();
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("long content labels don't push the remove buttons off-screen", async ({ testPage }) => {
      await testPage.goto(`/quran/${CHAPTER}`);

      const dialog = await openDisplaySettings(testPage);
      for (const name of [
        "Remove left pane content 1",
        "Remove left pane content 2",
        "Remove right pane content 1",
        "Remove right pane content 2",
      ]) {
        // No scrolling first: the overflow made the drawer scroll sideways, which would hide the bug. Only the
        // horizontal position is checked, since the last rows may be below the fold.
        const button = dialog.getByRole("button", { name, exact: true });
        await expect(button).toBeVisible();
        const box = await button.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      }
    });
  });

  test("opens offline storage and sync & backup", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);

    const dialog = await openSettings(testPage, "Offline Storage");

    await expect(dialog.getByRole("tab", { name: "Storage", exact: true })).toHaveAttribute("aria-selected", "true");
    const storage = dialog.getByRole("tabpanel", { name: "Storage", exact: true });
    await expect(storage.getByRole("heading", { name: "Text Content", exact: true })).toBeVisible();
    await expect(storage.getByRole("heading", { name: "Recitation Audio", exact: true })).toBeVisible();

    await dialog.getByRole("tab", { name: "Sync & Backup", exact: true }).click();
    const sync = dialog.getByRole("tabpanel", { name: "Sync & Backup", exact: true });
    await expect(sync.getByRole("link", { name: "Sync with Google Drive", exact: true })).toBeVisible();
  });
});
