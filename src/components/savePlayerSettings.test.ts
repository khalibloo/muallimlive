import { cookies } from "next/headers";

import { PLAYER_SETTINGS_KEY } from "@/utils/cookies";
import { savePlayerSettings } from "./savePlayerSettings";

describe("savePlayerSettings", () => {
  it("stores the settings as a JSON cookie", async () => {
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({ set } as any);

    await savePlayerSettings({ reciter: 7, hideTafsirs: false });

    expect(set).toHaveBeenCalledWith(PLAYER_SETTINGS_KEY, JSON.stringify({ reciter: 7, hideTafsirs: false }));
  });
});
