import type { Page } from "@playwright/test";

import { expect, test } from "../helpers/fixtures";
import { chapterHeading, chapterLabel } from "../helpers/data";

const homeHeading = (page: Page) => page.getByRole("heading", { level: 1, name: "MuallimLive", exact: true });
const quranHeading = (page: Page) => page.getByRole("heading", { level: 1, name: "Al-Qur'an", exact: true });

test.describe("Static pages", () => {
  test("home page is a dashboard of the modules", async ({ testPage }) => {
    await testPage.goto("/");

    await expect(testPage).toHaveTitle("MuallimLive");
    await expect(homeHeading(testPage)).toBeVisible();
    const modules = testPage.getByRole("navigation", { name: "Modules", exact: true });
    await expect(modules.getByRole("link", { name: /^Qur'an/ })).toHaveAttribute("href", "/quran");
    await expect(modules.getByRole("link", { name: /^Hadith/ })).toHaveAttribute("href", "/hadiths");

    await modules.getByRole("link", { name: /^Qur'an/ }).click();

    await expect(testPage).toHaveURL("/quran");
    await expect(testPage).toHaveTitle("Al-Qur'an | MuallimLive");
    await expect(quranHeading(testPage)).toBeVisible();
  });

  test("Qur'an page lists the chapters", async ({ testPage }) => {
    await testPage.goto("/quran");

    await testPage.getByRole("link", { name: chapterLabel(1), exact: true }).click();

    await expect(testPage).toHaveURL("/quran/1");
    await expect(testPage.getByRole("heading", { level: 1, name: chapterHeading(1), exact: true })).toBeVisible();
  });

  test("Qur'an page finds a chapter", async ({ testPage }) => {
    await testPage.goto("/quran");

    await testPage.getByRole("textbox", { name: "Find a chapter", exact: true }).fill("114");

    await expect(testPage.getByRole("link", { name: chapterLabel(114), exact: true })).toBeVisible();
    await expect(testPage.getByRole("link", { name: chapterLabel(1), exact: true })).toBeHidden();
  });

  test("home and Qur'an pages continue from the last verse read", async ({ testPage }) => {
    await testPage.goto("/quran/114");
    await expect(testPage.getByRole("heading", { level: 1, name: chapterHeading(114), exact: true })).toBeVisible();

    await testPage.getByRole("link", { name: "MuallimLive", exact: true }).click();

    await expect(testPage.getByRole("link", { name: /Continue reading/ })).toHaveAttribute("href", "/quran/114");

    await testPage.goto("/quran");

    await expect(testPage.getByRole("link", { name: /Continue reading/ })).toHaveAttribute("href", "/quran/114");
  });

  test("the nav bar menu goes to every section", async ({ testPage }) => {
    await testPage.goto("/");

    for (const [section, url, heading] of [
      ["Qur'an", "/quran", "Al-Qur'an"],
      ["Hadith", "/hadiths", "Hadiths"],
      ["Favorites & Notes", "/saved", "Favorites & Notes"],
      ["Home", "/", "MuallimLive"],
    ]) {
      await testPage.getByRole("button", { name: "Menu", exact: true }).click();
      await testPage.getByRole("menu").getByRole("link", { name: section, exact: true }).click();

      await expect(testPage).toHaveURL(url);
      await expect(testPage.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
    }
  });

  test("the old chapter routes are gone", async ({ testPage }) => {
    const response = await testPage.goto("/chapters/1");

    expect(response?.status()).toBe(404);
  });

  test("app name in the nav bar links back home", async ({ testPage }) => {
    await testPage.goto("/privacy");

    await testPage.getByRole("link", { name: "MuallimLive", exact: true }).click();

    await expect(testPage).toHaveURL("/");
    await expect(homeHeading(testPage)).toBeVisible();
  });

  test("privacy policy page", async ({ testPage }) => {
    await testPage.goto("/privacy");

    await expect(testPage).toHaveTitle("Privacy Policy | MuallimLive");
    await expect(testPage.getByRole("heading", { level: 1, name: "Privacy Policy", exact: true })).toBeVisible();
    await expect(
      testPage.getByText(
        "We do not store any data in our servers about your use of our service, however, we may use services such as analytics to analyze traffic to our website. This data is collected to help us improve our service and to focus our development efforts.",
        { exact: true },
      ),
    ).toBeVisible();
  });

  test("terms of service page", async ({ testPage }) => {
    await testPage.goto("/terms");

    await expect(testPage).toHaveTitle("Terms of Service | MuallimLive");
    await expect(testPage.getByRole("heading", { level: 1, name: "Terms of Service", exact: true })).toBeVisible();
    await expect(testPage.getByText("Have fun!", { exact: true })).toBeVisible();
    await expect(testPage.getByRole("link", { name: "https://www.quran.com", exact: true })).toHaveAttribute(
      "href",
      "https://www.quran.com",
    );
  });

  test("footer links to the terms and privacy pages", async ({ testPage }) => {
    await testPage.goto("/");
    const footer = testPage.getByRole("contentinfo");

    await expect(footer.getByText(`Khalibloo ©${new Date().getFullYear()} All Rights Reserved`)).toBeVisible();

    await footer.getByRole("link", { name: "Terms of Service", exact: true }).click();
    await expect(testPage).toHaveURL("/terms");
    await expect(testPage.getByRole("heading", { level: 1, name: "Terms of Service", exact: true })).toBeVisible();

    await footer.getByRole("link", { name: "Privacy Policy", exact: true }).click();
    await expect(testPage).toHaveURL("/privacy");
    await expect(testPage.getByRole("heading", { level: 1, name: "Privacy Policy", exact: true })).toBeVisible();
  });
});

test.describe("Page not found", () => {
  const expectNotFoundPage = async (page: Page) => {
    await expect(page).toHaveTitle("Page Not Found | MuallimLive");
    await expect(page.getByRole("heading", { name: "Uh-oh, Page not found!", exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Sorry, we could not find the page you're looking for. It may have been moved or you visited an invalid link.",
        { exact: true },
      ),
    ).toBeVisible();
  };

  test("unknown route shows the 404 page and links home", async ({ testPage }) => {
    const response = await testPage.goto("/this-page-does-not-exist");

    expect(response?.status()).toBe(404);
    await expectNotFoundPage(testPage);

    await testPage.getByRole("link", { name: "Go Back To Home", exact: true }).click();
    await expect(testPage).toHaveURL("/");
    await expect(homeHeading(testPage)).toBeVisible();
  });

  test("unknown chapter shows the 404 page", async ({ testPage }) => {
    const response = await testPage.goto("/quran/999");

    expect(response?.status()).toBe(404);
    await expectNotFoundPage(testPage);
  });
});

test.describe("Web app manifest", () => {
  test("is served with the app details", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");

    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: "MuallimLive",
      short_name: "MuallimLive",
      start_url: "/",
      scope: "/",
      display: "standalone",
    });
    expect(manifest.icons).toHaveLength(3);
  });
});
