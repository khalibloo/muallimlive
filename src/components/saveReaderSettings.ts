"use server";

import { cookies } from "next/headers";

export async function saveReaderSettings(data: ReaderSettings) {
  cookies().set("reader-settings", JSON.stringify(data));
}
