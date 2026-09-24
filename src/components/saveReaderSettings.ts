"use server";

import { cookies } from "next/headers";

import { READER_SETTINGS_KEY } from "@/utils/cookies";

export async function saveReaderSettings(data: ReaderSettings) {
  (await cookies()).set(READER_SETTINGS_KEY, JSON.stringify(data));
}
