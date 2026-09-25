import type { BrowserContext } from "@playwright/test";

/** In-memory Google sign-in and Drive app folder, shared by every context routed to it */
export interface FakeGoogle {
  file?: { version: number; content: string };
  account: { accountId: string; email: string };
  tokenStatus: number;
}

const FILE_ID = "muallimlive-file";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

export const createFakeGoogle = (): FakeGoogle => ({
  account: { accountId: "reader-1", email: "reader@example.com" },
  tokenStatus: 200,
});

export const driveFaves = (google: FakeGoogle) =>
  google.file
    ? Object.entries(JSON.parse(google.file.content).faves as Record<string, { deleted?: true }>)
        .filter(([, fave]) => !fave.deleted)
        .map(([key]) => key)
    : [];

export const routeFakeGoogle = async (context: BrowserContext, google: FakeGoogle) => {
  // Signing in returns straight to the page, as Google's consent and the callback would
  await context.route(
    (url) => url.pathname === "/api/sync/login",
    (route) => {
      const url = new URL(route.request().url());
      const back = new URL(url.searchParams.get("returnTo") ?? "/", url.origin);
      back.searchParams.set("sync", "connected");
      return route.fulfill({ status: 302, headers: { Location: back.href } });
    },
  );
  await context.route(
    (url) => url.pathname === "/api/sync/token",
    (route) =>
      google.tokenStatus === 200
        ? route.fulfill({ json: { accessToken: "token", expiresAt: Date.now() + 3_600_000, ...google.account } })
        : route.fulfill({ status: google.tokenStatus }),
  );
  await context.route(
    (url) => url.pathname === "/api/sync/disconnect",
    (route) => route.fulfill({ status: 204 }),
  );
  await context.route(
    (url) => url.hostname === "www.googleapis.com",
    async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: CORS });
      }
      const url = new URL(request.url());
      const meta = () => ({ id: FILE_ID, version: `${google.file!.version}` });
      if (url.pathname === "/drive/v3/files") {
        return route.fulfill({ headers: CORS, json: { files: google.file ? [meta()] : [] } });
      }
      if (url.pathname === `/drive/v3/files/${FILE_ID}` && google.file) {
        return url.searchParams.get("alt") === "media"
          ? route.fulfill({ headers: CORS, contentType: "application/json", body: google.file.content })
          : route.fulfill({ headers: CORS, json: meta() });
      }
      if (url.pathname.startsWith("/upload/drive/v3/files")) {
        const body = request.postDataBuffer()!.toString();
        // an update sends the file itself; a create sends multipart form data with the file as one part
        const content =
          request.method() === "PATCH" ? body : body.split(/\r?\n/).find((line) => line.startsWith('{"app"'))!;
        google.file = { version: (google.file?.version ?? 0) + 1, content };
        return route.fulfill({ headers: CORS, json: meta() });
      }
      return route.fulfill({ status: 404, headers: CORS });
    },
  );
};
