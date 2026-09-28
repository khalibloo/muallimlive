import { NextRequest } from "next/server";

import { COLOR_SCHEME_KEY, READER_SETTINGS_KEY, SETTINGS_COOKIE_OPTIONS } from "@/utils/cookies";
import { proxy } from "./proxy";

const request = (method: string, cookie: string) =>
  new NextRequest("http://localhost/quran/1", { method, headers: { cookie } });

describe("proxy", () => {
  it("renews the settings cookies the reader has", () => {
    const response = proxy(request("GET", `${COLOR_SCHEME_KEY}=light; other=1`));

    expect(response.cookies.get(COLOR_SCHEME_KEY)).toMatchObject({ value: "light", ...SETTINGS_COOKIE_OPTIONS });
    expect(response.cookies.get(READER_SETTINGS_KEY)).toBeUndefined();
    expect(response.cookies.get("other")).toBeUndefined();
  });

  it("leaves server action requests alone", () => {
    const response = proxy(request("POST", `${COLOR_SCHEME_KEY}=light`));

    expect(response.cookies.getAll()).toEqual([]);
  });
});
