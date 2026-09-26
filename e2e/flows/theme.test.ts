import type { Page } from "@playwright/test";

import { expect, test } from "../helpers/fixtures";

// The page backgrounds from src/theme.ts
const DARK_PAGE = "rgb(19, 20, 20)";
const LIGHT_PAGE = "rgb(247, 245, 239)";
const SEPIA_PAGE = "rgb(241, 231, 208)";

const pageBackground = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const chooseTheme = async (page: Page, theme: "Light" | "Sepia" | "Dark") => {
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  await page.getByRole("menuitem", { name: theme, exact: true }).click();
};

test.describe("Color theme", () => {
  test("defaults to the dark theme", async ({ testPage }) => {
    await testPage.goto("/");

    expect(await pageBackground(testPage)).toBe(DARK_PAGE);
  });

  test("switching the theme persists across reloads", async ({ testPage, context }) => {
    await testPage.goto("/chapters/114");

    await chooseTheme(testPage, "Light");

    await expect.poll(() => pageBackground(testPage)).toBe(LIGHT_PAGE);
    expect((await context.cookies()).find((c) => c.name === "color-scheme")?.value).toBe("light");

    await testPage.reload();
    expect(await pageBackground(testPage)).toBe(LIGHT_PAGE);

    await chooseTheme(testPage, "Sepia");
    await expect.poll(() => pageBackground(testPage)).toBe(SEPIA_PAGE);

    await chooseTheme(testPage, "Dark");
    await expect.poll(() => pageBackground(testPage)).toBe(DARK_PAGE);
  });

  test("the choice outlives the browser session and is renewed on each visit", async ({
    testPage,
    context,
    baseURL,
  }) => {
    const expiry = async () => (await context.cookies()).find((c) => c.name === "color-scheme")?.expires ?? -1;
    const inDays = (days: number) => Date.now() / 1000 + days * 24 * 60 * 60;

    await context.addCookies([{ name: "color-scheme", value: "light", url: baseURL, expires: Math.round(inDays(1)) }]);
    await testPage.goto("/");

    expect(await pageBackground(testPage)).toBe(LIGHT_PAGE);
    expect(await expiry()).toBeGreaterThan(inDays(364));
  });
});
