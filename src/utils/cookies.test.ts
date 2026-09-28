import config from "./config";
import { parseColorScheme, parsePlaySettings, parseReaderSettings } from "./cookies";

describe("parseReaderSettings", () => {
  it("returns the defaults when the cookie is missing", () => {
    expect(parseReaderSettings()).toEqual(config.defaultReaderSettings);
    expect(parseReaderSettings("")).toEqual(config.defaultReaderSettings);
  });

  it("returns the defaults when the cookie is not valid JSON", () => {
    expect(parseReaderSettings("{not json")).toEqual(config.defaultReaderSettings);
  });

  it.each([
    ["null", "null"],
    ["a number", "42"],
    ["missing splitView", JSON.stringify({ left: [], right: [] })],
    ["non-boolean splitView", JSON.stringify({ splitView: "yes", left: [], right: [] })],
    ["non-array left", JSON.stringify({ splitView: true, left: {}, right: [] })],
    ["non-array right", JSON.stringify({ splitView: true, left: [], right: "x" })],
  ])("returns the defaults for %s", (_, value) => {
    expect(parseReaderSettings(value)).toEqual(config.defaultReaderSettings);
  });

  it("passes valid settings through", () => {
    const settings: ReaderSettings = {
      splitView: false,
      left: [{ content: ["translation", "en", 20] }],
      right: [],
    };
    expect(parseReaderSettings(JSON.stringify(settings))).toEqual(settings);
  });

  it("keeps a numeric text size and drops any other", () => {
    const settings: ReaderSettings = { splitView: false, left: [], right: [], textSize: 120 };
    expect(parseReaderSettings(JSON.stringify(settings))).toEqual(settings);
    expect(parseReaderSettings(JSON.stringify({ ...settings, textSize: "huge" }))).toEqual({
      splitView: false,
      left: [],
      right: [],
    });
  });

  it("keeps boolean tajweed colors and glosses switches and drops any other", () => {
    const settings: ReaderSettings = { splitView: false, left: [], right: [], tajweedColors: false, glosses: true };
    expect(parseReaderSettings(JSON.stringify(settings))).toEqual(settings);
    expect(parseReaderSettings(JSON.stringify({ ...settings, tajweedColors: "no", glosses: 0 }))).toEqual({
      splitView: false,
      left: [],
      right: [],
    });
  });

  it("keeps the valid tajweed rule styles", () => {
    const settings: ReaderSettings = { splitView: false, left: [], right: [] };
    const tajweedRules = { "hamzat-wasl": { look: "hidden" }, qalqalah: { color: "red" } };
    expect(parseReaderSettings(JSON.stringify({ ...settings, tajweedRules }))).toEqual({ ...settings, tajweedRules });
  });

  it("drops unknown or malformed tajweed rule styles", () => {
    const settings: ReaderSettings = { splitView: false, left: [], right: [] };
    const tajweedRules = {
      "hamzat-wasl": { look: "blurred" },
      qalqalah: { color: "pink" },
      "not-a-rule": { look: "hidden" },
    };
    expect(parseReaderSettings(JSON.stringify({ ...settings, tajweedRules }))).toEqual(settings);
    expect(parseReaderSettings(JSON.stringify({ ...settings, tajweedRules: "hidden" }))).toEqual(settings);
    expect(
      parseReaderSettings(JSON.stringify({ ...settings, tajweedRules: { ikhfa: { color: "none" }, iqlab: null } })),
    ).toEqual({ ...settings, tajweedRules: { ikhfa: { color: "none" } } });
  });
});

describe("parsePlaySettings", () => {
  it("returns the defaults when the cookie is missing", () => {
    expect(parsePlaySettings()).toEqual(config.defaultPlaySettings);
  });

  it("returns the defaults when the cookie is not valid JSON", () => {
    expect(parsePlaySettings("oops")).toEqual(config.defaultPlaySettings);
  });

  it.each([
    ["null", "null"],
    ["non-number reciter", JSON.stringify({ reciter: "7", hideTafsirs: true })],
    ["non-boolean hideTafsirs", JSON.stringify({ reciter: 7, hideTafsirs: 1 })],
  ])("returns the defaults for %s", (_, value) => {
    expect(parsePlaySettings(value)).toEqual(config.defaultPlaySettings);
  });

  it("passes valid settings through", () => {
    const settings: PlaySettings = { reciter: 7, hideTafsirs: false };
    expect(parsePlaySettings(JSON.stringify(settings))).toEqual(settings);
  });
});

describe("parseColorScheme", () => {
  it.each([undefined, "", "blue"])("returns the default for %j", (value) => {
    expect(parseColorScheme(value)).toBe(config.defaultColorScheme);
  });

  it.each(["light", "sepia", "dark"])("passes %s through", (value) => {
    expect(parseColorScheme(value)).toBe(value);
  });
});
