import "server-only";

import { OAuth2Client } from "google-auth-library";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

import config from "@/utils/config";

export interface SyncSession {
  refreshToken: string;
  accountId: string;
  email: string;
}

interface LoginSession {
  state: string;
  codeVerifier: string;
  returnTo: string;
}

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const SCOPES = ["openid", "email", DRIVE_SCOPE];

export const googleClient = (origin: string) =>
  new OAuth2Client({
    clientId: config.googleClientId,
    clientSecret: config.googleClientSecret,
    redirectUri: `${origin}/api/sync/callback`,
  });

/** Google answered with an OAuth error, e.g. `invalid_grant` for a revoked or expired refresh token */
export const isGoogleError = (e: unknown, error: string) =>
  (e as { response?: { data?: { error?: unknown } } })?.response?.data?.error === error;

const options = (cookieName: string, ttl: number): SessionOptions => ({
  cookieName,
  password: config.syncSessionSecret!,
  ttl,
  cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/api/sync" },
});

/** Holds the refresh token for a year; the token route re-saves it, so it only expires after a year unused */
export const getSyncSession = async () =>
  getIronSession<SyncSession>(await cookies(), options("sync-session", 365 * 24 * 60 * 60));

export const getLoginSession = async () =>
  getIronSession<LoginSession>(await cookies(), options("sync-login", 10 * 60));

/** A path on this site to return to after signing in; anything else returns home */
export const safeReturnTo = (value: string | null, origin: string) => {
  const target = URL.parse(value || "/", origin);
  // a path starting with "//" would leave the site when resolved again
  return target?.origin === origin && !target.pathname.startsWith("//") ? `${target.pathname}${target.search}` : "/";
};
