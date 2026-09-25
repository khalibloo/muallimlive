import { expect, test } from "../helpers/fixtures";

test.describe("Progressive web app", () => {
  test("the service worker script is served", async ({ request }) => {
    const response = await request.get("/serwist/sw.js");

    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("javascript");
  });

  test.describe("with service workers allowed", () => {
    // The config blocks service workers so they can't cache across tests; this spec needs the real one
    test.use({ serviceWorkers: "allow" });

    test("registers the service worker", async ({ testPage, context, baseURL }) => {
      const serviceWorker = context.waitForEvent("serviceworker");

      await testPage.goto("/");

      expect((await serviceWorker).url()).toBe(`${baseURL}/serwist/sw.js`);
      await expect
        .poll(() =>
          testPage.evaluate(async () => {
            const registration = await navigator.serviceWorker.getRegistration("/");
            return registration?.active?.state ?? null;
          }),
        )
        .toBe("activated");
    });
  });
});
