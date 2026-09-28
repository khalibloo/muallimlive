import config from "./config";
import { READER_SETTINGS_KEY } from "./cookies";
import { NO_TAJWEED_CLASS, SETTINGS_SCRIPT } from "./settingsScript";
import { parseTajweedRules, tajweedStyles } from "./tajweed";

const html = document.documentElement;

const runScript = (readerSettings: unknown) => {
  const value = typeof readerSettings === "string" ? readerSettings : JSON.stringify(readerSettings);
  document.cookie = `${READER_SETTINGS_KEY}=${encodeURIComponent(value)}`;
  new Function(SETTINGS_SCRIPT)();
};

const tajweedClasses = () => [...html.classList].filter((c) => c.startsWith("tajweed-")).sort();

describe("SETTINGS_SCRIPT", () => {
  afterEach(() => {
    document.cookie = `${READER_SETTINGS_KEY}=; max-age=0`;
    html.className = "";
    html.removeAttribute("style");
  });

  it("applies the text size and the tajweed colors switch", () => {
    runScript({ ...config.defaultReaderSettings, textSize: 140, tajweedColors: false });

    expect(html).toHaveClass(config.defaultColorScheme, NO_TAJWEED_CLASS);
    expect(html.style.getPropertyValue("--reader-scale")).toBe("1.4");
  });

  it("applies the same rule styles as the server, dropping unknown values", () => {
    const tajweedRules = {
      "hamzat-wasl": { look: "hidden" },
      qalqalah: { color: "red", look: "faded" },
      ikhfa: { color: "none" },
      iqlab: { color: "pink", look: "blurred" },
      "not-a-rule": { look: "hidden" },
      izhar: null,
    };
    runScript({ ...config.defaultReaderSettings, tajweedRules });

    const { classNames, style } = tajweedStyles(parseTajweedRules(tajweedRules));
    expect(tajweedClasses()).toEqual([...classNames].sort());
    expect(tajweedClasses()).toEqual(["tajweed-fade-qalqalah", "tajweed-hide-hamzat-wasl"]);
    for (const [name, value] of Object.entries(style)) {
      expect(html.style.getPropertyValue(name)).toBe(value);
    }
    expect(html.style.getPropertyValue("--tajweed-iqlab")).toBe("");
  });

  it("removes the rule styles the cookie no longer asks for", () => {
    html.classList.add("tajweed-hide-qalqalah", "tajweed-fade-ikhfa");
    html.style.setProperty("--tajweed-qalqalah", "var(--palette-red)");

    runScript({ ...config.defaultReaderSettings, tajweedRules: { ikhfa: { look: "hidden" } } });

    expect(tajweedClasses()).toEqual(["tajweed-hide-ikhfa"]);
    expect(html.style.getPropertyValue("--tajweed-qalqalah")).toBe("");
  });

  it.each(["{not json", JSON.stringify({ tajweedRules: "hidden" }), "null"])(
    "keeps the defaults for the cookie %s",
    (value) => {
      html.classList.add("tajweed-hide-qalqalah");

      runScript(value);

      expect(html).toHaveClass(config.defaultColorScheme);
      expect(html).not.toHaveClass(NO_TAJWEED_CLASS);
      expect(html.style.getPropertyValue("--reader-scale")).toBe("1");
      expect(tajweedClasses()).toEqual([]);
    },
  );
});
