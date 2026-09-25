import type { NextRequest } from "next/server";

import { getSyncSession, googleClient, isGoogleError } from "@/utils/syncSession";

export async function POST(request: NextRequest) {
  const session = await getSyncSession();
  if (!session.refreshToken) {
    return new Response(null, { status: 401 });
  }
  try {
    const client = googleClient(request.nextUrl.origin);
    client.setCredentials({ refresh_token: session.refreshToken });
    const { credentials } = await client.refreshAccessToken();
    // re-saved to renew the cookie's lifetime
    await session.save();
    return Response.json({
      accessToken: credentials.access_token,
      expiresAt: credentials.expiry_date,
      accountId: session.accountId,
      email: session.email,
    });
  } catch (e) {
    // Revoked, expired, or the account's password changed: only signing in again helps
    if (isGoogleError(e, "invalid_grant")) {
      session.destroy();
      return new Response(null, { status: 401 });
    }
    return new Response(null, { status: 503 });
  }
}
