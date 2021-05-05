interface VerseLayoutItem {
  content?: ["translation" | "tafsir", string, number | string];
}
interface ReaderSettings {
  splitView: boolean;
  left: VerseLayoutItem[];
  right: VerseLayoutItem[];
}
