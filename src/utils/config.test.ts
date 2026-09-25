import config from "./config";

describe("config", () => {
  it("reads the API URIs from the environment", () => {
    expect(config.apiUri).toBe("http://cdn.test");
    expect(config.apiMediaUri).toBe("https://audio.test");
  });

  it("provides valid default reader and player settings", () => {
    expect(config.defaultReaderSettings.splitView).toBe(true);
    expect(config.defaultReaderSettings.left.length).toBeGreaterThan(0);
    expect(config.defaultReaderSettings.right.length).toBeGreaterThan(0);
    expect(config.defaultPlaySettings).toEqual({ reciter: 1, hideTafsirs: true });
  });
});
