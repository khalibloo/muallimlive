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
  /** Colors the tajweed rules in the texts that mark them, on by default */
  tajweedColors?: boolean;
  /** Each rule's color and look, keyed by rule id, only for the rules that differ from their defaults */
  tajweedRules?: Record<string, TajweedRuleStyle>;
  /** Shows a transliteration's word glosses on hover or tap, on by default */
  glosses?: boolean;
}

type TajweedColor = (typeof import("./utils/tajweed").TAJWEED_COLORS)[number];
type TajweedLook = (typeof import("./utils/tajweed").TAJWEED_LOOKS)[number];

interface TajweedRuleStyle {
  /** absent: the rule's default color; "none": the normal text color */
  color?: TajweedColor | "none";
  /** absent: normal */
  look?: TajweedLook;
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
