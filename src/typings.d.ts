declare module "eslint-plugin-jsx-a11y";

interface VerseLayoutItem {
  content?: ["translation" | "tafsir", string, number | string];
}

interface ReaderSettings {
  splitView: boolean;
  left: VerseLayoutItem[];
  right: VerseLayoutItem[];
}

interface PlaySettings {
  reciter: number;
  hideTafsirs: boolean;
}
