import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../helpers/fixtures";

const openNotes = async (page: Page) => {
  await page
    .getByRole("article", { name: "Verse 1", exact: true })
    .getByRole("button", { name: "Notes", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Notes Q112:1", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};

const newNoteEditor = (dialog: Locator) => dialog.getByRole("textbox", { name: "New note", exact: true });
const editNoteEditor = (dialog: Locator) => dialog.getByRole("textbox", { name: "Edit note", exact: true });

const addNote = async (page: Page, text: string) => {
  const dialog = await openNotes(page);
  const saveButton = dialog.getByRole("button", { name: "Save New Note", exact: true });
  await expect(saveButton).toBeDisabled();

  await newNoteEditor(dialog).fill(text);
  await saveButton.click();

  await expect(dialog.getByText(text, { exact: true })).toBeVisible();
  await expect(saveButton).toBeDisabled();
  return dialog;
};

test.describe("Verse notes", () => {
  test("a new verse has no notes", async ({ testPage }) => {
    await testPage.goto("/chapters/112");

    const dialog = await openNotes(testPage);

    await expect(dialog.getByText("You have not added any notes for this verse", { exact: true })).toBeVisible();
  });

  test("adding a note persists across reloads", async ({ testPage }) => {
    await testPage.goto("/chapters/112");

    const dialog = await addNote(testPage, "Surah of pure monotheism");
    await expect(dialog.getByText("You have not added any notes for this verse", { exact: true })).toBeHidden();

    await testPage.reload();
    const reloadedDialog = await openNotes(testPage);
    await expect(reloadedDialog.getByText("Surah of pure monotheism", { exact: true })).toBeVisible();
  });

  test("editing a note persists across reloads", async ({ testPage }) => {
    await testPage.goto("/chapters/112");
    const dialog = await addNote(testPage, "First thoughts");

    await dialog.getByRole("button", { name: "Edit note", exact: true }).click();
    await editNoteEditor(dialog).fill("Revised thoughts");
    await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();

    await expect(dialog.getByText("Revised thoughts", { exact: true })).toBeVisible();
    await expect(dialog.getByText("First thoughts", { exact: true })).toBeHidden();

    await testPage.reload();
    const reloadedDialog = await openNotes(testPage);
    await expect(reloadedDialog.getByText("Revised thoughts", { exact: true })).toBeVisible();
    await expect(reloadedDialog.getByText("First thoughts", { exact: true })).toBeHidden();
  });

  test("cancelling an edit keeps the note unchanged", async ({ testPage }) => {
    await testPage.goto("/chapters/112");
    const dialog = await addNote(testPage, "Keep me");

    await dialog.getByRole("button", { name: "Edit note", exact: true }).click();
    await editNoteEditor(dialog).fill("Discarded edit");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).first().click();

    await expect(dialog.getByText("Keep me", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Discarded edit", { exact: true })).toBeHidden();
  });

  test("deleting a note persists across reloads", async ({ testPage }) => {
    await testPage.goto("/chapters/112");
    const dialog = await addNote(testPage, "Delete me");

    await dialog.getByRole("button", { name: "Delete note", exact: true }).click();
    const confirmation = testPage.getByText("Delete note forever?", { exact: true });
    await expect(confirmation).toBeVisible();
    // Under load a click in the popup can land while it is being realigned and be dropped (it stays open),
    // so confirm until it closes
    await expect(async () => {
      await testPage.getByRole("button", { name: "Delete", exact: true }).click({ timeout: 2000 });
      await expect(confirmation).toBeHidden({ timeout: 1000 });
    }).toPass();

    await expect(dialog.getByText("Delete me", { exact: true })).toBeHidden();
    await expect(dialog.getByText("You have not added any notes for this verse", { exact: true })).toBeVisible();

    await testPage.reload();
    const reloadedDialog = await openNotes(testPage);
    await expect(
      reloadedDialog.getByText("You have not added any notes for this verse", { exact: true }),
    ).toBeVisible();
    await expect(reloadedDialog.getByText("Delete me", { exact: true })).toBeHidden();
  });
});
