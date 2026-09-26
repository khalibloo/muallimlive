import { expect, test } from "../helpers/fixtures";

test.describe("Favorites and notes page", () => {
  test("lists the favorite verses and notes, and links to them", async ({ testPage }) => {
    await testPage.goto("/chapters/112");
    const firstVerse = testPage.getByRole("article", { name: "Verse 1", exact: true });
    await firstVerse.getByRole("button", { name: "Add to favorites", exact: true }).click();
    await expect(firstVerse.getByRole("button", { name: "Remove from favorites", exact: true })).toBeVisible();

    await firstVerse.getByRole("button", { name: "Notes", exact: true }).click();
    const notes = testPage.getByRole("dialog", { name: "Notes Q112:1", exact: true });
    await notes.getByRole("textbox", { name: "New note", exact: true }).fill("Nothing is like Him");
    await notes.getByRole("button", { name: "Save New Note", exact: true }).click();
    await expect(notes.getByText("Nothing is like Him", { exact: true })).toBeVisible();
    await notes.getByRole("button", { name: "Close", exact: true }).click();

    await testPage.getByRole("link", { name: "Favorites & Notes", exact: true }).first().click();
    await expect(testPage.getByRole("heading", { level: 1, name: "Favorites & Notes" })).toBeVisible();

    const fave = testPage.getByRole("article", { name: "Verse 112:1", exact: true });
    await expect(fave.getByText("Say: He is Allah, the One and Only;", { exact: true })).toBeVisible();

    await expect(fave.getByText("Nothing is like Him", { exact: true })).toBeHidden();

    await testPage.getByRole("tab", { name: "Notes", exact: true }).click();
    const noted = testPage.getByRole("tabpanel").getByRole("article", { name: "Verse 112:1", exact: true });
    await expect(noted.getByText("Nothing is like Him", { exact: true })).toBeVisible();
    await expect(noted.getByText("Say: He is Allah, the One and Only;", { exact: true })).toBeVisible();

    await noted.getByRole("link", { name: "Go to verse 112:1", exact: true }).click();
    await expect(testPage).toHaveURL(/\/chapters\/112#v-1$/);
    await expect(testPage.getByRole("article", { name: "Verse 1", exact: true })).toBeVisible();
  });

  test("unfavoriting removes the verse from the list", async ({ testPage }) => {
    await testPage.goto("/chapters/112");
    const firstVerse = testPage.getByRole("article", { name: "Verse 1", exact: true });
    await firstVerse.getByRole("button", { name: "Add to favorites", exact: true }).click();
    await expect(firstVerse.getByRole("button", { name: "Remove from favorites", exact: true })).toBeVisible();

    await testPage.goto("/saved");
    const fave = testPage.getByRole("article", { name: "Verse 112:1", exact: true });
    await fave.getByRole("button", { name: "Remove from favorites", exact: true }).click();

    await expect(fave).toBeHidden();
    await expect(testPage.getByText("You haven't added any favorites yet", { exact: true })).toBeVisible();
    await testPage.reload();
    await expect(testPage.getByText("You haven't added any favorites yet", { exact: true })).toBeVisible();
  });
});
