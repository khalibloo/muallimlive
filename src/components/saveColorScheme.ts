"use server";

import { cookies } from "next/headers";

import { COLOR_SCHEME_KEY, SETTINGS_COOKIE_OPTIONS } from "@/utils/cookies";

export async function saveColorScheme(colorScheme: ColorScheme) {
  (await cookies()).set(COLOR_SCHEME_KEY, colorScheme, SETTINGS_COOKIE_OPTIONS);
}
