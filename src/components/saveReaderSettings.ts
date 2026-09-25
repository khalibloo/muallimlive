"use server";

import { cookies } from "next/headers";

import { READER_SETTINGS_KEY, SETTINGS_COOKIE_OPTIONS } from "@/utils/cookies";

export async function saveReaderSettings(data: ReaderSettings) {
  (await cookies()).set(READER_SETTINGS_KEY, JSON.stringify(data), SETTINGS_COOKIE_OPTIONS);
}
