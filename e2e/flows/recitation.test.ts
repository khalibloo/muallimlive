import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../helpers/fixtures";
import { recitationUrl, tafsirExcerpt } from "../helpers/data";

// Chapter 112 has 4 verses. The default reciter is 1 (AbdulBaset AbdulSamad, Mujawwad), see src/utils/config.ts.
// Every recitation file is served by the testPage fixture as a silent WAV (30s unless overridden).
const CHAPTER = 112;
const DEFAULT_RECITER = 1;
const ALAFASY = 7;

const verseAudio = (verse: number, reciter = DEFAULT_RECITER) => recitationUrl(CHAPTER, reciter, verse);

const openPlayOptions = async (page: Page) => {
  await page.getByRole("button", { name: "Recite", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Play Options", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};

/**
 * Picks an antd Select option. Under load an option click can land before the popup settles and be
 * dropped, so the pick is retried until `selected` shows it took effect.
 */
const pickOption = async (page: Page, combobox: Locator, option: string, selected: Locator) => {
  await expect(async () => {
    await combobox.click();
    await page.getByText(option, { exact: true }).last().click({ timeout: 2000 });
    await expect(selected).toBeVisible({ timeout: 1000 });
  }).toPass();
};

/** Starts reciting the whole chapter and waits until the first verse is playing */
const startRecitation = async (page: Page) => {
  const dialog = await openPlayOptions(page);
  const firstVerse = page.waitForRequest(verseAudio(1));
  await dialog.getByRole("button", { name: "Play", exact: true }).click();
  await firstVerse;
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
};

test.describe("Recitation", () => {
  test("play options default to the saved player settings", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);

    const dialog = await openPlayOptions(testPage);

    await expect(dialog.getByRole("combobox", { name: "Audio Reciter", exact: true })).toBeVisible();
    await expect(dialog.getByText("AbdulBaset AbdulSamad (Mujawwad)", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("checkbox", { name: "Hide Tafsirs", exact: true })).toBeChecked();
    await expect(dialog.getByText("Entire Surah", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("spinbutton", { name: "From Verse", exact: true })).toBeHidden();
  });

  test("playing the chapter shows the audio bar and plays from the media host", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);

    await startRecitation(testPage);

    await expect(testPage.getByRole("button", { name: "Read", exact: true })).toBeVisible();
    await expect(testPage.getByRole("button", { name: "Recite", exact: true })).toBeHidden();
    for (const name of ["Auto scroll", "Loop", "Previous verse", "Next verse", "Volume", "Play Options"]) {
      await expect(testPage.getByRole("button", { name, exact: true })).toBeVisible();
    }
  });

  test("pause and play toggle the recitation", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);
    await startRecitation(testPage);

    await testPage.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(testPage.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    await expect(testPage.getByRole("button", { name: "Pause", exact: true })).toBeHidden();

    await testPage.getByRole("button", { name: "Play", exact: true }).click();
    await expect(testPage.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  });

  test("next and previous verse move through the chapter", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);
    await startRecitation(testPage);
    const nextButton = testPage.getByRole("button", { name: "Next verse", exact: true });

    // Moving to verse 2 preloads verse 3
    const verse3 = testPage.waitForRequest(verseAudio(3));
    await nextButton.click();
    await verse3;
    await expect(testPage.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

    const verse1 = testPage.waitForRequest(verseAudio(1));
    await testPage.getByRole("button", { name: "Previous verse", exact: true }).click();
    await verse1;
    await expect(testPage.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

    // Next is disabled on the last verse
    await nextButton.click();
    await nextButton.click();
    const verse4 = testPage.waitForRequest(verseAudio(4));
    await nextButton.click();
    await verse4;
    await expect(nextButton).toBeDisabled();
  });

  test("loop wraps from the last verse back to the first", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);
    await startRecitation(testPage);
    const nextButton = testPage.getByRole("button", { name: "Next verse", exact: true });
    const loopButton = testPage.getByRole("button", { name: "Loop", exact: true });

    await nextButton.click();
    await nextButton.click();
    await nextButton.click();
    await expect(nextButton).toBeDisabled();

    await expect(loopButton).toHaveAttribute("aria-pressed", "false");
    await loopButton.click();
    await expect(loopButton).toHaveAttribute("aria-pressed", "true");
    await expect(nextButton).toBeEnabled();

    const verse1 = testPage.waitForRequest(verseAudio(1));
    await nextButton.click();
    await verse1;
    await expect(testPage.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

    await loopButton.click();
    await expect(loopButton).toHaveAttribute("aria-pressed", "false");
    // Back on verse 1, so there are verses ahead again
    await expect(nextButton).toBeEnabled();
  });

  test("auto scroll and mute can be toggled", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);
    await startRecitation(testPage);
    const autoScroll = testPage.getByRole("button", { name: "Auto scroll", exact: true });

    await expect(autoScroll).toHaveAttribute("aria-pressed", "true");
    await autoScroll.click();
    await expect(autoScroll).toHaveAttribute("aria-pressed", "false");

    await testPage.getByRole("button", { name: "Volume", exact: true }).click();
    await expect(testPage.getByRole("slider", { name: "Volume level", exact: true })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    await testPage.getByRole("button", { name: "Mute", exact: true }).click();
    await expect(testPage.getByRole("button", { name: "Unmute", exact: true })).toBeVisible();
    await testPage.getByRole("button", { name: "Unmute", exact: true }).click();
    await expect(testPage.getByRole("button", { name: "Mute", exact: true })).toBeVisible();
  });

  test("stopping the recitation asks for confirmation", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);
    await startRecitation(testPage);
    const readButton = testPage.getByRole("button", { name: "Read", exact: true });

    await readButton.click();
    await expect(testPage.getByText("Stop recitation?", { exact: true })).toBeVisible();
    await testPage.getByRole("button", { name: "No", exact: true }).click();
    await expect(testPage.getByText("Stop recitation?", { exact: true })).toBeHidden();
    await expect(readButton).toBeVisible();
    await expect(testPage.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

    await readButton.click();
    await testPage.getByRole("button", { name: "Yes", exact: true }).click();

    await expect(testPage.getByRole("button", { name: "Recite", exact: true })).toBeVisible();
    await expect(readButton).toBeHidden();
    await expect(testPage.getByRole("button", { name: "Next verse", exact: true })).toBeHidden();
    await expect(testPage.getByRole("button", { name: "Pause", exact: true })).toBeHidden();
  });

  test("tafsirs are hidden while reciting unless the option is unchecked", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);
    const tafsir = testPage.getByText(tafsirExcerpt(CHAPTER, 0, 1));
    await expect(tafsir).toBeVisible();

    await startRecitation(testPage);
    await expect(tafsir).toBeHidden();

    await testPage.getByRole("button", { name: "Play Options", exact: true }).click();
    const dialog = testPage.getByRole("dialog", { name: "Play Options", exact: true });
    // Under load a click in the opening dialog can be dropped, and uncheck() then fails, so retry it
    await expect(async () => {
      await dialog.getByRole("checkbox", { name: "Hide Tafsirs", exact: true }).uncheck({ timeout: 2000 });
    }).toPass();
    await dialog.getByRole("button", { name: "Play", exact: true }).click();
    await expect(dialog).toBeHidden();

    await expect(tafsir).toBeVisible();

    // The choice is saved in the player settings
    await testPage.reload();
    const reopened = await openPlayOptions(testPage);
    await expect(reopened.getByRole("checkbox", { name: "Hide Tafsirs", exact: true })).not.toBeChecked();
  });

  test("changing the reciter plays their recording and persists", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);

    const dialog = await openPlayOptions(testPage);
    await pickOption(
      testPage,
      dialog.getByRole("combobox", { name: "Audio Reciter", exact: true }),
      "Mishari Rashid al-`Afasy",
      dialog.getByText("Mishari Rashid al-`Afasy", { exact: true }),
    );
    const alafasyVerse1 = testPage.waitForRequest(verseAudio(1, ALAFASY));
    await dialog.getByRole("button", { name: "Play", exact: true }).click();

    await alafasyVerse1;
    await expect(testPage.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

    await testPage.reload();
    const reopened = await openPlayOptions(testPage);
    await expect(reopened.getByText("Mishari Rashid al-`Afasy", { exact: true })).toBeVisible();
  });

  test("verse range plays only the selected verses", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);

    const dialog = await openPlayOptions(testPage);
    await pickOption(
      testPage,
      dialog.getByRole("combobox", { name: "Recite", exact: true }),
      "Verse Range",
      dialog.getByRole("spinbutton", { name: "To Verse", exact: true }),
    );
    await dialog.getByRole("spinbutton", { name: "To Verse", exact: true }).fill("3");
    await dialog.getByRole("spinbutton", { name: "From Verse", exact: true }).fill("2");
    const verse2 = testPage.waitForRequest(verseAudio(2));
    await dialog.getByRole("button", { name: "Play", exact: true }).click();

    await verse2;
    await expect(testPage.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    const nextButton = testPage.getByRole("button", { name: "Next verse", exact: true });
    await expect(nextButton).toBeEnabled();

    await nextButton.click();
    // Verse 3 ends the range
    await expect(nextButton).toBeDisabled();
  });

  test.describe("with short clips", () => {
    test.use({ audioClipSeconds: 0.5 });

    test("plays through to the end of the chapter and stops", async ({ testPage }) => {
      await testPage.goto(`/quran/${CHAPTER}`);
      const lastVerse = testPage.waitForRequest(verseAudio(4));

      await startRecitation(testPage);
      await lastVerse;

      // After the last verse ends the player rewinds to verse 1 and pauses
      await expect(testPage.getByRole("button", { name: "Play", exact: true })).toBeVisible({ timeout: 10000 });
      await expect(testPage.getByRole("button", { name: "Next verse", exact: true })).toBeEnabled();
    });

    test("a single verse can be played on its own", async ({ testPage }) => {
      await testPage.goto(`/quran/${CHAPTER}`);
      const playVerse = testPage
        .getByRole("article", { name: "Verse 1", exact: true })
        .getByRole("button", { name: "Play verse", exact: true });

      const verse1 = testPage.waitForRequest(verseAudio(1));
      await playVerse.click();
      await verse1;

      // The clip ends by itself and the button resets
      await expect(playVerse).toBeVisible();
      await expect(testPage.getByRole("button", { name: "Stop verse", exact: true })).toHaveCount(0);
    });
  });

  test("a playing verse can be stopped", async ({ testPage }) => {
    await testPage.goto(`/quran/${CHAPTER}`);

    const verse1 = testPage.waitForRequest(verseAudio(1));
    await testPage
      .getByRole("article", { name: "Verse 1", exact: true })
      .getByRole("button", { name: "Play verse", exact: true })
      .click();
    await verse1;

    const stopVerse = testPage.getByRole("button", { name: "Stop verse", exact: true });
    await expect(stopVerse).toHaveCount(1);
    await stopVerse.click();
    await expect(stopVerse).toHaveCount(0);
    // Recitation mode was never entered
    await expect(testPage.getByRole("button", { name: "Recite", exact: true })).toBeVisible();
  });
});
