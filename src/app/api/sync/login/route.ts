import { randomBytes } from "node:crypto";
import { CodeChallengeMethod } from "google-auth-library";
import { NextResponse, type NextRequest } from "next/server";

import { getLoginSession, googleClient, safeReturnTo, SCOPES } from "@/utils/syncSession";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const client = googleClient(origin);
  const state = randomBytes(32).toString("base64url");
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const url = client.generateAuthUrl({
    // a refresh token, and a new one on every sign-in so each device has its own; and a choice of account
    access_type: "offline",
    prompt: "consent select_account",
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });

  const session = await getLoginSession();
  Object.assign(session, { state, codeVerifier, returnTo: safeReturnTo(searchParams.get("returnTo"), origin) });
  await session.save();
  return NextResponse.redirect(url);
}
