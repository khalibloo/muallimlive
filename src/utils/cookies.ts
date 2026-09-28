import config from "./config";
import { parseTajweedRules } from "./tajweed";

export const READER_SETTINGS_KEY = "reader-settings";
export const PLAYER_SETTINGS_KEY = "player-settings";
export const COLOR_SCHEME_KEY = "color-scheme";
export const SETTINGS_COOKIE_KEYS = [READER_SETTINGS_KEY, PLAYER_SETTINGS_KEY, COLOR_SCHEME_KEY];

/** Settings cookies last a year, and `src/proxy.ts` renews them on every visit so they only expire when unused */
export const SETTINGS_COOKIE_OPTIONS = { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" } as const;

const parseJson = (value?: string): unknown => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** Parses the reader settings cookie, falling back to the defaults when it is missing or malformed */
export const parseReaderSettings = (value?: string): ReaderSettings => {
  const data = parseJson(value);
  if (isRecord(data) && typeof data.splitView === "boolean" && Array.isArray(data.left) && Array.isArray(data.right)) {
    const { textSize, tajweedColors, glosses, tajweedRules, ...settings } = data as unknown as ReaderSettings;
    const rules = parseTajweedRules(tajweedRules);
    return {
      ...settings,
      ...(typeof textSize === "number" && { textSize }),
      ...(typeof tajweedColors === "boolean" && { tajweedColors }),
      ...(typeof glosses === "boolean" && { glosses }),
      ...(rules && { tajweedRules: rules }),
    };
  }
  return config.defaultReaderSettings;
};

/** Parses the player settings cookie, falling back to the defaults when it is missing or malformed */
export const parsePlaySettings = (value?: string): PlaySettings => {
  const data = parseJson(value);
  if (isRecord(data) && typeof data.reciter === "number" && typeof data.hideTafsirs === "boolean") {
    return data as unknown as PlaySettings;
  }
  return config.defaultPlaySettings;
};

export const COLOR_SCHEMES: ColorScheme[] = ["light", "sepia", "dark"];

/** Parses the color scheme cookie, falling back to the default when it is missing or unknown */
export const parseColorScheme = (value?: string): ColorScheme =>
  COLOR_SCHEMES.find((scheme) => scheme === value) ?? config.defaultColorScheme;
