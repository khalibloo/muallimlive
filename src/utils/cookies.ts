import config from "./config";

export const READER_SETTINGS_KEY = "reader-settings";
export const PLAYER_SETTINGS_KEY = "player-settings";

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
    return data as unknown as ReaderSettings;
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
