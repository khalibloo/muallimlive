import type { Page } from "@playwright/test";

import { expect, test } from "../helpers/fixtures";
import { chapterHeading } from "../helpers/data";

test.describe("Static pages", () => {
  test("home page links to Al-Qur'an", async ({ testPage }) => {
    await testPage.goto("/");

    await expect(testPage).toHaveTitle("MuallimLive");
    await expect(testPage.getByRole("heading", { name: "Hadith", exact: true })).toBeVisible();
    await expect(testPage.getByText("Coming soon", { exact: true })).toBeVisible();

    await testPage.getByRole("link", { name: "Al-Qur'an", exact: true }).click();

    await expect(testPage).toHaveURL("/chapters/1");
    await expect(testPage.getByRole("heading", { level: 1, name: chapterHeading(1), exact: true })).toBeVisible();
  });

  test("app name in the nav bar links back home", async ({ testPage }) => {
    await testPage.goto("/privacy");

    await testPage.getByRole("link", { name: "MuallimLive", exact: true }).click();

    await expect(testPage).toHaveURL("/");
    await expect(testPage.getByRole("link", { name: "Al-Qur'an", exact: true })).toBeVisible();
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
    await expect(testPage.getByRole("link", { name: "Al-Qur'an", exact: true })).toBeVisible();
  });

  test("unknown chapter shows the 404 page", async ({ testPage }) => {
    const response = await testPage.goto("/chapters/999");

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
