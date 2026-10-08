import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../helpers/fixtures";
import { openSettings, saveSettings } from "../helpers/settings";

const openTajweedSettings = (page: Page) => openSettings(page, "Tajweed");

const ruleGroup = (dialog: Locator, rule: string) => dialog.getByRole("group", { name: rule, exact: true });

const pickColor = async (page: Page, dialog: Locator, rule: string, color: string) => {
  const box = ruleGroup(dialog, rule).getByRole("combobox", { name: "Color", exact: true });
  await box.fill(color);
  await expect(page.getByRole("option", { name: color, exact: true })).toBeAttached();
  await box.press("Enter");
};

// Under load an option click can land before the popup settles and be dropped, so retry until it shows
const pickLook = async (page: Page, dialog: Locator, rule: string, look: string) => {
  const group = ruleGroup(dialog, rule);
  await expect(async () => {
    await group.getByRole("combobox", { name: "Look", exact: true }).click();
    await page.getByText(look, { exact: true }).last().click({ timeout: 2000 });
    await expect(group.getByText(look, { exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass();
};

test.describe("Tajweed settings", () => {
  test("hiding hamzat al-wasl hides it in both scripts and persists", async ({ testPage }) => {
    await testPage.goto("/quran/1");
    // the "A" of "Bismi Allahi" in the transliteration, and the Uthmani hamzat al-wasl
    const transliteration = testPage.locator("tajweed.HmA").first();
    const uthmani = testPage.locator("tajweed.ham_wasl").first();
    await expect(transliteration).toBeVisible();
    await expect(uthmani).toBeVisible();

    const dialog = await openTajweedSettings(testPage);
    await pickLook(testPage, dialog, "Hamzat al-Wasl", "Hidden");
    await saveSettings(testPage, dialog);

    await expect(transliteration).toBeHidden();
    await expect(uthmani).toBeHidden();
    await testPage.reload();
    await expect(testPage.getByRole("article", { name: "Verse 1", exact: true })).toBeVisible();
    await expect(transliteration).toBeHidden();
    await expect(uthmani).toBeHidden();
  });

  test("coloring and fading qalqalah changes its look and persists", async ({ testPage }) => {
    await testPage.goto("/quran/113");
    const qalqalah = testPage.locator("tajweed.qalaqah").first();
    const look = () =>
      qalqalah.evaluate((el) => {
        const style = getComputedStyle(el);
        return { color: style.color, opacity: style.opacity };
      });
    await expect(qalqalah).toBeVisible();
    const before = await look();
    expect(before.opacity).toBe("1");

    const dialog = await openTajweedSettings(testPage);
    await pickColor(testPage, dialog, "Qalqalah", "Blue");
    await pickLook(testPage, dialog, "Qalqalah", "Faded");
    await saveSettings(testPage, dialog);

    await expect.poll(async () => (await look()).opacity).toBe("0.35");
    const after = await look();
    expect(after.color).not.toBe(before.color);
    await testPage.reload();
    await expect(qalqalah).toBeAttached();
    await expect.poll(look).toEqual(after);
  });

  test("turning the tajweed colors off uncolors the texts but keeps hidden rules hidden, and persists", async ({
    testPage,
  }) => {
    await testPage.goto("/quran/1");
    const verse = testPage.getByRole("article", { name: "Verse 1", exact: true });
    // how many of the verse's markings (in the Arabic and the transliteration) look different from their text
    const styledMarkings = () =>
      verse.locator("tajweed").evaluateAll(
        (markings) =>
          markings.filter((el) => {
            const [own, text] = [getComputedStyle(el), getComputedStyle(el.parentElement!)];
            return own.color !== text.color || own.fontWeight !== text.fontWeight;
          }).length,
      );
    const hamzat = testPage.locator("tajweed.ham_wasl").first();
    await expect.poll(styledMarkings).toBeGreaterThan(0);

    const dialog = await openTajweedSettings(testPage);
    await pickLook(testPage, dialog, "Hamzat al-Wasl", "Hidden");
    await dialog.getByRole("switch", { name: "Tajweed Colors", exact: true }).click();
    await saveSettings(testPage, dialog);

    await expect.poll(styledMarkings).toBe(0);
    await expect(hamzat).toBeHidden();
    await testPage.reload();
    await expect(verse).toBeVisible();
    await expect.poll(styledMarkings).toBe(0);
    await expect(hamzat).toBeHidden();
  });

  test("previews an unsaved change without applying it, and discards it on cancel", async ({ testPage }) => {
    await testPage.goto("/quran/113");
    const onPage = testPage.getByRole("article", { name: "Verse 1", exact: true }).locator("tajweed.qalaqah").first();
    await expect(onPage).toBeVisible();

    const dialog = await openTajweedSettings(testPage);
    const preview = dialog.getByRole("region", { name: "Preview", exact: true });
    await pickLook(testPage, dialog, "Qalqalah", "Hidden");

    await expect(preview.locator("tajweed.qalaqah, tajweed.Q").first()).toBeAttached();
    await expect(preview.locator("tajweed.qalaqah, tajweed.Q").first()).toBeHidden();
    // the Select's popup can scroll the virtualized verse list away from verse 1, so check the page's rule styles
    await expect(testPage.locator("html")).not.toHaveClass(/tajweed-hide-qalqalah/);

    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await testPage.keyboard.press("Home");
    await expect(onPage).toBeVisible();

    const reopened = await openTajweedSettings(testPage);
    await expect(ruleGroup(reopened, "Qalqalah").getByText("Normal", { exact: true })).toBeVisible();
  });
});
