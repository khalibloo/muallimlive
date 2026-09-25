import { NextRequest, NextResponse } from "next/server";

import { SETTINGS_COOKIE_KEYS, SETTINGS_COOKIE_OPTIONS } from "@/utils/cookies";

// Renews the settings cookies on every page visit, so they only expire after a year without one.
// Only GET requests: server actions (POSTs) write their own new value, which a renewal must not race.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (request.method !== "GET") {
    return response;
  }
  for (const key of SETTINGS_COOKIE_KEYS) {
    const cookie = request.cookies.get(key);
    if (cookie) {
      response.cookies.set(key, cookie.value, SETTINGS_COOKIE_OPTIONS);
    }
  }
  return response;
}

export const config = {
  // pages only: no route handlers, Next assets, the service worker or files with an extension
  matcher: ["/((?!api/|_next/|serwist/|.*\\.).*)"],
};
