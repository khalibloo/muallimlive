import { test as base, type Page } from "@playwright/test";

import { MEDIA_URI, silentWav } from "./audio";

interface TestOptions {
  /** Pre-accept the cookie notice so it doesn't cover the page. Disable to test the notice itself. */
  acceptCookieNotice: boolean;
  /** Length of the silent clip served for every recitation audio file */
  audioClipSeconds: number;
}

interface TestFixtures {
  testPage: Page;
}

export const test = base.extend<TestOptions & TestFixtures>({
  acceptCookieNotice: [true, { option: true }],
  audioClipSeconds: [30, { option: true }],

  testPage: async ({ page, context, acceptCookieNotice, audioClipSeconds }, provide) => {
    if (acceptCookieNotice) {
      // The notice's acceptance lives in localforage (IndexedDB), so seed it before any app script runs.
      // The open request is queued ahead of localforage's own, so the flag is always there when it reads.
      await page.addInitScript(() => {
        const request = indexedDB.open("localforage");
        request.onupgradeneeded = () => {
          request.result.createObjectStore("keyvaluepairs");
          request.result.createObjectStore("local-forage-detect-blob-support");
        };
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("keyvaluepairs", "readwrite");
          transaction.objectStore("keyvaluepairs").put(true, "accepted_cookie_notice");
          transaction.oncomplete = () => db.close();
        };
      });
    }

    // Never hit the real recitation CDN: every audio file is a short silent clip. Routed on the context so
    // the service worker's requests are mocked too, with CORS like the real host for offline downloads.
    const audio = silentWav(audioClipSeconds);
    await context.route(`${MEDIA_URI}/**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "audio/wav",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: audio,
      }),
    );

    // Wrap goto()/reload() so every navigation waits for client hydration before the test interacts.
    // The app sets html[data-hydrated="true"] once React mounts (see Providers). Client-nav <Link>s and
    // buttons only work post-hydration, so clicking before this marker appears silently no-ops.
    const waitForHydration = () =>
      page.locator("html[data-hydrated='true']").waitFor({ state: "attached", timeout: 15000 });
    const originalGoto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await originalGoto(url, options);
      await waitForHydration();
      return response;
    };
    const originalReload = page.reload.bind(page);
    page.reload = async (options) => {
      const response = await originalReload(options);
      await waitForHydration();
      return response;
    };

    await provide(page);
  },
});

export { expect } from "@playwright/test";
