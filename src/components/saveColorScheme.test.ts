import { cookies } from "next/headers";

import { COLOR_SCHEME_KEY, SETTINGS_COOKIE_OPTIONS } from "@/utils/cookies";
import { saveColorScheme } from "./saveColorScheme";

describe("saveColorScheme", () => {
  it("stores the color scheme in a cookie", async () => {
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({ set } as any);

    await saveColorScheme("light");

    expect(set).toHaveBeenCalledWith(COLOR_SCHEME_KEY, "light", SETTINGS_COOKIE_OPTIONS);
  });
});
