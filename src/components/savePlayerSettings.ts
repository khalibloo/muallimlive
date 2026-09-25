"use server";

import { cookies } from "next/headers";

import { PLAYER_SETTINGS_KEY, SETTINGS_COOKIE_OPTIONS } from "@/utils/cookies";

export async function savePlayerSettings(data: PlaySettings) {
  (await cookies()).set(PLAYER_SETTINGS_KEY, JSON.stringify(data), SETTINGS_COOKIE_OPTIONS);
}
