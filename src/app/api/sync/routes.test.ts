// @vitest-environment node
// (iron-session's Web Crypto output fails jsdom's Uint8Array checks)
import { OAuth2Client } from "google-auth-library";
import { NextRequest } from "next/server";

import { stubCookies } from "@/components/test/fakeCookies";
import { GET as callback } from "./callback/route";
import { POST as disconnect } from "./disconnect/route";
import { GET as login } from "./login/route";
import { POST as token } from "./token/route";

vi.mock("@/utils/config", async (importOriginal) => ({
  default: {
    ...(await importOriginal<{ default: object }>()).default,
    googleClientId: "client-id",
    googleClientSecret: "client-secret",
    syncSessionSecret: "a-test-secret-that-is-at-least-32-chars",
  },
}));

// Only the calls reaching Google are faked; building the authorization URL and PKCE run for real
const getToken = vi.spyOn(OAuth2Client.prototype, "getToken");
const verifyIdToken = vi.spyOn(OAuth2Client.prototype, "verifyIdToken");
const refreshAccessToken = vi.spyOn(OAuth2Client.prototype, "refreshAccessToken");
const revokeToken = vi.spyOn(OAuth2Client.prototype, "revokeToken");

const ORIGIN = "http://localhost";
const tokens = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  id_token: "id-token",
  scope: "https://www.googleapis.com/auth/userinfo.email openid https://www.googleapis.com/auth/drive.appdata",
};
// what gaxios throws when Google answers with an OAuth error
const googleError = (error: string) => Object.assign(new Error(error), { response: { data: { error } } });
/** The path of an app URL; a URL leaving the app stays whole */
const appPath = (href: string | null) => {
  const url = new URL(href!);
  return url.origin === ORIGIN ? `${url.pathname}${url.search}` : href;
};

const startLogin = async (returnTo = "/quran/2") => {
  const response = await login(new NextRequest(`${ORIGIN}/api/sync/login?returnTo=${encodeURIComponent(returnTo)}`));
  const location = new URL(response.headers.get("Location")!);
  return { response, location, state: location.searchParams.get("state")! };
};

const finishLogin = (query: string) => callback(new NextRequest(`${ORIGIN}/api/sync/callback?${query}`));

const signIn = async () => {
  const { state } = await startLogin();
  await finishLogin(`code=abc&state=${state}`);
};

describe("sync routes", () => {
  let jar: ReturnType<typeof stubCookies>;

  beforeEach(() => {
    vi.clearAllMocks();
    jar = stubCookies();
    getToken.mockResolvedValue({ tokens, res: null } as never);
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: "user-1", email: "reader@example.com" }) } as never);
  });

  describe("login", () => {
    it("redirects to Google asking for offline access to the app folder", async () => {
      const { location, state } = await startLogin();

      expect(`${location.origin}${location.pathname}`).toBe("https://accounts.google.com/o/oauth2/v2/auth");
      expect(appPath(location.searchParams.get("redirect_uri"))).toBe("/api/sync/callback");
      expect(Object.fromEntries(location.searchParams)).toMatchObject({
        client_id: "client-id",
        response_type: "code",
        access_type: "offline",
        prompt: "consent select_account",
        scope: "openid email https://www.googleapis.com/auth/drive.appdata",
        code_challenge_method: "S256",
      });
      expect(location.searchParams.get("code_challenge")).toBeTruthy();
      expect(state).toMatch(/^[\w-]{43}$/);
      expect(jar.get("sync-login")?.options).toMatchObject({ httpOnly: true, path: "/api/sync" });
    });

    it.each(["https://evil.example/", "//evil.example/", "/\\evil.example", "/.//evil.example", "http://["])(
      "returns home instead of to %s",
      async (returnTo) => {
        const { state } = await startLogin(returnTo);

        const response = await finishLogin(`code=abc&state=${state}`);

        expect(appPath(response.headers.get("Location"))).toBe("/?sync=connected");
      },
    );
  });

  describe("callback", () => {
    it("saves the session and returns with sync=connected", async () => {
      const { state } = await startLogin("/quran/2");

      const response = await finishLogin(`code=abc&state=${state}`);

      expect(appPath(response.headers.get("Location"))).toBe("/quran/2?sync=connected");
      expect(getToken).toHaveBeenCalledWith({ code: "abc", codeVerifier: expect.any(String) });
      expect(verifyIdToken).toHaveBeenCalledWith({ idToken: "id-token", audience: "client-id" });
      expect(jar.has("sync-login")).toBe(false);
      expect(jar.get("sync-session")?.options).toMatchObject({ httpOnly: true, secure: true, path: "/api/sync" });
    });

    it.each([
      ["a mismatched state", (state: string) => `code=abc&state=${state}x`],
      ["a denied consent", (state: string) => `error=access_denied&state=${state}`],
    ])("fails on %s", async (_, query) => {
      const { state } = await startLogin("/quran/2");

      const response = await finishLogin(query(state));

      expect(appPath(response.headers.get("Location"))).toBe("/quran/2?sync=failed");
      expect(jar.has("sync-session")).toBe(false);
    });

    it("fails without the login cookie", async () => {
      const response = await finishLogin("code=abc&state=anything");

      expect(appPath(response.headers.get("Location"))).toBe("/?sync=failed");
    });

    it("fails when Google rejects the code", async () => {
      const { state } = await startLogin("/");
      getToken.mockRejectedValue(googleError("invalid_grant"));

      const response = await finishLogin(`code=abc&state=${state}`);

      expect(appPath(response.headers.get("Location"))).toBe("/?sync=failed");
    });

    it("fails when Google returns no refresh token", async () => {
      const { state } = await startLogin("/");
      getToken.mockResolvedValue({ tokens: { ...tokens, refresh_token: undefined }, res: null } as never);

      const response = await finishLogin(`code=abc&state=${state}`);

      expect(appPath(response.headers.get("Location"))).toBe("/?sync=failed");
      expect(jar.has("sync-session")).toBe(false);
    });

    it("fails when the reader withheld access to Drive", async () => {
      const { state } = await startLogin("/");
      getToken.mockResolvedValue({
        tokens: { ...tokens, scope: "https://www.googleapis.com/auth/userinfo.email openid" },
        res: null,
      } as never);

      const response = await finishLogin(`code=abc&state=${state}`);

      expect(appPath(response.headers.get("Location"))).toBe("/?sync=failed");
      expect(jar.has("sync-session")).toBe(false);
    });
  });

  describe("token", () => {
    const refresh = () => token(new NextRequest(`${ORIGIN}/api/sync/token`, { method: "POST" }));

    it("answers a fresh access token and the account", async () => {
      await signIn();
      refreshAccessToken.mockResolvedValue({
        credentials: { access_token: "access-token", expiry_date: 2_000_000_000_000 },
        res: null,
      } as never);

      const response = await refresh();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        accessToken: "access-token",
        expiresAt: 2_000_000_000_000,
        accountId: "user-1",
        email: "reader@example.com",
      });
      const client = refreshAccessToken.mock.contexts[0] as OAuth2Client;
      expect(client.credentials.refresh_token).toBe("refresh-token");
    });

    it("is unauthorized without a session", async () => {
      expect((await refresh()).status).toBe(401);
    });

    it("is unauthorized and forgets the session when Google revoked it", async () => {
      await signIn();
      refreshAccessToken.mockRejectedValue(googleError("invalid_grant"));

      expect((await refresh()).status).toBe(401);
      expect(jar.has("sync-session")).toBe(false);
    });

    it("is unavailable when Google can't be reached, keeping the session", async () => {
      await signIn();
      refreshAccessToken.mockRejectedValue(new Error("offline"));

      expect((await refresh()).status).toBe(503);
      expect(jar.has("sync-session")).toBe(true);
    });
  });

  describe("disconnect", () => {
    const stop = () => disconnect(new NextRequest(`${ORIGIN}/api/sync/disconnect`, { method: "POST" }));

    it("revokes the token and forgets the session", async () => {
      await signIn();
      revokeToken.mockResolvedValue({} as never);

      expect((await stop()).status).toBe(204);
      expect(revokeToken).toHaveBeenCalledWith("refresh-token");
      expect(jar.has("sync-session")).toBe(false);
    });

    it("forgets the session even when revoking fails", async () => {
      await signIn();
      revokeToken.mockRejectedValue(new Error("offline"));

      expect((await stop()).status).toBe(204);
      expect(jar.has("sync-session")).toBe(false);
    });
  });
});
