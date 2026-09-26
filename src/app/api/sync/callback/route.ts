import { NextResponse, type NextRequest } from "next/server";

import config from "@/utils/config";
import { DRIVE_SCOPE, getLoginSession, getSyncSession, googleClient } from "@/utils/syncSession";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const login = await getLoginSession();
  const { state, codeVerifier, returnTo = "/" } = login;
  login.destroy();

  const back = (result: "connected" | "failed") => {
    const url = new URL(returnTo, origin);
    url.searchParams.set("sync", result);
    return NextResponse.redirect(url);
  };

  const code = searchParams.get("code");
  if (!code || !state || !codeVerifier || searchParams.get("state") !== state) {
    return back("failed");
  }
  try {
    const client = googleClient(origin);
    const { tokens } = await client.getToken({ code, codeVerifier });
    // the reader can untick Drive access on Google's consent screen
    if (!tokens.refresh_token || !tokens.id_token || !tokens.scope?.split(" ").includes(DRIVE_SCOPE)) {
      return back("failed");
    }
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.googleClientId });
    const { sub, email = "" } = ticket.getPayload() ?? {};
    if (!sub) {
      return back("failed");
    }
    const session = await getSyncSession();
    Object.assign(session, { refreshToken: tokens.refresh_token, accountId: sub, email });
    await session.save();
    return back("connected");
  } catch {
    return back("failed");
  }
}
