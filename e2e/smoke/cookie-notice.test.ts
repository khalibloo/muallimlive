import { expect, test } from "../helpers/fixtures";

test.describe("Cookie notice", () => {
  // A fresh visitor who has not accepted the notice yet
  test.use({ acceptCookieNotice: false });

  test("is shown to new visitors", async ({ testPage }) => {
    await testPage.goto("/");
    const notice = testPage.getByRole("region", { name: "Cookie notice", exact: true });

    await expect(notice).toBeVisible();
    await expect(
      notice.getByText(
        "This website uses cookies. By continuing to use the website, you indicate that you are fine with this.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(notice.getByRole("link", { name: "Privacy Policy", exact: true })).toHaveAttribute("href", "/privacy");
  });

  test("stays hidden after it is accepted", async ({ testPage }) => {
    await testPage.goto("/");
    const notice = testPage.getByRole("region", { name: "Cookie notice", exact: true });

    await notice.getByRole("button", { name: "Accept Cookies", exact: true }).click();
    await expect(notice).toBeHidden();

    await testPage.reload();
    await expect(testPage.getByRole("heading", { level: 1, name: "Al-Qur'an", exact: true })).toBeVisible();
    await expect(notice).toBeHidden();
  });
});
