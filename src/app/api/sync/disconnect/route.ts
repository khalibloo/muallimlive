import type { NextRequest } from "next/server";

import { getSyncSession, googleClient } from "@/utils/syncSession";

export async function POST(request: NextRequest) {
  const session = await getSyncSession();
  if (session.refreshToken) {
    // best effort: the token is useless without the cookie anyway
    await googleClient(request.nextUrl.origin)
      .revokeToken(session.refreshToken)
      .catch(() => undefined);
  }
  session.destroy();
  return new Response(null, { status: 204 });
}
