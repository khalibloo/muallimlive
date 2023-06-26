"use server";

import { cookies } from "next/headers";

export async function savePlayerSettings(data: PlaySettings) {
  cookies().set("player-settings", JSON.stringify(data));
}
