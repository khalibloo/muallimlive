import { cookies } from "next/headers";

import { READER_SETTINGS_KEY, SETTINGS_COOKIE_OPTIONS } from "@/utils/cookies";
import { saveReaderSettings } from "./saveReaderSettings";

describe("saveReaderSettings", () => {
  it("stores the settings as a JSON cookie", async () => {
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({ set } as any);
    const settings: ReaderSettings = { splitView: false, left: [{ content: ["tafsir", "en", 169] }], right: [] };

    await saveReaderSettings(settings);

    expect(set).toHaveBeenCalledWith(READER_SETTINGS_KEY, JSON.stringify(settings), SETTINGS_COOKIE_OPTIONS);
  });
});
