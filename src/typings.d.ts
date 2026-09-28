declare module "eslint-plugin-jsx-a11y";

interface VerseLayoutItem {
  content?: ["translation" | "tafsir", string, number | string];
}

interface ReaderSettings {
  splitView: boolean;
  left: VerseLayoutItem[];
  right: VerseLayoutItem[];
  /** Verse text size in percent, 100 by default */
  textSize?: number;
  /** Colours the tajweed rules in the texts that mark them, on by default */
  tajweedColors?: boolean;
  /** Shows a transliteration's word glosses on hover or tap, on by default */
  glosses?: boolean;
}

interface PlaySettings {
  reciter: number;
  hideTafsirs: boolean;
}

type ColorScheme = "light" | "sepia" | "dark";

/** The chapter and verse the reader last had in view */
interface LastRead {
  chapter: number;
  verse: number;
}
