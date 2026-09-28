import { bookName, collectionName, hadithReference, hadithText } from "../helpers/data";
import { expect, test } from "../helpers/fixtures";

const heading = (collection: string, book: number, id: string) =>
  `${collectionName(collection)}, ${hadithReference(collection, book, id)}`;

test.describe("Hadiths", () => {
  test("drills down from the home page to a hadith", async ({ testPage }) => {
    await testPage.goto("/");
    await testPage
      .getByRole("navigation", { name: "Modules", exact: true })
      .getByRole("link", { name: /^Hadith/ })
      .click();
    await expect(testPage.getByRole("heading", { level: 1, name: "Hadiths" })).toBeVisible();
    await testPage.getByRole("link", { name: new RegExp(collectionName("bukhari")) }).click();
    await expect(testPage.getByRole("heading", { level: 1, name: collectionName("bukhari") })).toBeVisible();
    await testPage.getByRole("link", { name: new RegExp(`^13\\. ${bookName("bukhari", 13)}`) }).click();
    await expect(testPage.getByRole("heading", { level: 1, name: `13. ${bookName("bukhari", 13)}` })).toBeVisible();
    await testPage.getByRole("link", { name: /^1\b/ }).first().click();
    await expect(testPage.getByRole("heading", { level: 1, name: heading("bukhari", 13, "1") })).toBeVisible();
    await expect(testPage.getByText(hadithText("bukhari", 13, "1"), { exact: true })).toBeVisible();
    await expect(testPage).toHaveTitle(`${collectionName("bukhari")} 13:1 | MuallimLive`);
  });

  test("keeps Bukhari's repeated ids apart", async ({ testPage }) => {
    await testPage.goto("/hadiths/bukhari/1/1");
    await expect(testPage.getByText(hadithText("bukhari", 1, "1"), { exact: true })).toBeVisible();
    await testPage.goto("/hadiths/bukhari/13/1");
    await expect(testPage.getByText(hadithText("bukhari", 13, "1"), { exact: true })).toBeVisible();
  });

  test("steps across a book boundary", async ({ testPage }) => {
    await testPage.goto("/hadiths/bukhari/2/55");
    await testPage.getByRole("link", { name: "Next hadith" }).click();
    await expect(testPage).toHaveURL(/\/hadiths\/bukhari\/13\/1$/);
    await testPage.getByRole("link", { name: "Previous hadith" }).click();
    await expect(testPage).toHaveURL(/\/hadiths\/bukhari\/2\/55$/);
  });

  test("opens a Malik hadith with a dotted id", async ({ testPage }) => {
    await testPage.goto("/hadiths/malik/4/4.1.1");
    await expect(testPage.getByRole("heading", { level: 1, name: heading("malik", 4, "4.1.1") })).toBeVisible();
  });

  test("is not found for an unknown hadith", async ({ testPage }) => {
    const response = await testPage.goto("/hadiths/bukhari/13/999");
    expect(response?.status()).toBe(404);
  });

  test("favorites and notes a hadith, then lists both", async ({ testPage }) => {
    await testPage.goto("/hadiths/bukhari/13/1");
    await testPage.getByRole("button", { name: "Add to favorites", exact: true }).click();
    await expect(testPage.getByRole("button", { name: "Remove from favorites", exact: true })).toBeVisible();

    await testPage.getByRole("button", { name: "Notes", exact: true }).click();
    const notes = testPage.getByRole("dialog", { name: `Notes: ${heading("bukhari", 13, "1")}`, exact: true });
    await notes.getByRole("textbox", { name: "New note", exact: true }).fill("Friday note");
    await notes.getByRole("button", { name: "Save New Note", exact: true }).click();
    await expect(notes.getByText("Friday note", { exact: true })).toBeVisible();
    await testPage.keyboard.press("Escape");

    await testPage.goto("/saved");
    const section = testPage.getByRole("region", { name: "Hadith", exact: true });
    await expect(section.getByRole("article", { name: heading("bukhari", 13, "1"), exact: true })).toBeVisible();
    await testPage.getByRole("tab", { name: "Notes", exact: true }).click();
    await expect(
      testPage.getByRole("tabpanel").getByRole("region", { name: "Hadith", exact: true }).getByText("Friday note"),
    ).toBeVisible();
  });
});
