import MiniSearch, { type SearchOptions } from "minisearch";

import { readText } from "./offline";
import { packKey, type ContentPack } from "./packs";

// Verse search: one MiniSearch word index per text (a pack, or one chapter of it), searched in the browser.
// Queries and texts are normalized the same way, so Arabic matches without its diacritics.

type IndexedVerse = { verse_key: string; text: string };

export type VerseIndex = MiniSearch<IndexedVerse>;

/** Every word of the query must match, from its beginning, with an edit or two in longer words */
const SEARCH_OPTIONS: SearchOptions = {
  combineWith: "AND",
  prefix: true,
  fuzzy: (term) => (term.length > 4 ? 0.2 : false),
  maxFuzzy: 2,
};

/** MiniSearch's default word separators, captured so the text between words can be kept */
const WORD_SEPARATORS = /([\n\r\p{Z}\p{P}]+)/u;

/** Words shown before and after the first match of a long text */
const EXCERPT_WORDS = 25;

/** Lowercases and drops accents, Arabic diacritics and Qur'anic marks, and unifies the alef and yaa variants */
export const normalizeTerm = (term: string) =>
  term
    .normalize("NFD")
    // combining marks, tatweel, small waw and small yaa
    .replace(/[\p{M}ـۥۦ]/gu, "")
    .replace(/ٱ/g, "ا")
    .replace(/ى/g, "ي")
    .toLowerCase();

const BLOCKS = "p, div, li, br, h1, h2, h3, h4, h5, h6, tr";

/** The text of CDN HTML, without footnote numbers; blocks are separated by spaces */
export const toPlainText = (html: string) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("sup").forEach((sup) => sup.remove());
  doc.querySelectorAll(BLOCKS).forEach((block) => block.after(" "));
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
};

export const buildIndex = (texts: VerseText[]): VerseIndex => {
  const index = new MiniSearch<IndexedVerse>({
    idField: "verse_key",
    fields: ["text"],
    storeFields: ["text"],
    processTerm: normalizeTerm,
  });
  index.addAll(
    texts.filter((v) => v.text).map((v) => ({ verse_key: v.verse_key, text: v.isHTML ? toPlainText(v.text) : v.text })),
  );
  return index;
};

export interface SearchHit {
  verseKey: string;
  chapter: number;
  verse: number;
  score: number;
  /** The texts that matched, in the order of the indexes, with the index terms they matched */
  texts: { key: string; text: string; terms: string[] }[];
}

/** Searches each index, and lists every matching verse once, best first */
export const searchIndexes = (indexes: { key: string; index: VerseIndex }[], query: string): SearchHit[] => {
  if (!query.trim()) {
    return [];
  }
  const hits = new Map<string, SearchHit>();
  for (const { key, index } of indexes) {
    for (const result of index.search(query, SEARCH_OPTIONS)) {
      const verseKey = `${result.id}`;
      const [chapter, verse] = verseKey.split(":").map(Number);
      const hit = hits.get(verseKey) ?? { verseKey, chapter, verse, score: 0, texts: [] };
      hit.score = Math.max(hit.score, result.score);
      hit.texts.push({ key, text: result.text, terms: result.terms });
      hits.set(verseKey, hit);
    }
  }
  return [...hits.values()].sort((a, b) => b.score - a.score || a.chapter - b.chapter || a.verse - b.verse);
};

export interface Highlighted {
  parts: { text: string; match: boolean }[];
  /** Whether text was left out before or after the parts */
  before: boolean;
  after: boolean;
}

/** Splits a text into its matched words and the text between them, shortened around the first match */
export const highlight = (
  text: string,
  terms: string[],
  processTerm: (term: string) => string | string[] | null = normalizeTerm,
): Highlighted => {
  // words at even positions, separators at odd ones
  const tokens = text.split(WORD_SEPARATORS);
  if (tokens.at(-1) === "") {
    tokens.pop();
  }
  const isMatch = (token: string, i: number) =>
    i % 2 === 0 && [processTerm(token) ?? []].flat().some((term) => terms.includes(term));
  const wordCount = Math.ceil(tokens.length / 2);
  const firstMatch = Math.max(0, tokens.findIndex(isMatch)) / 2;
  const first = Math.max(0, Math.floor(firstMatch) - EXCERPT_WORDS);
  const last = Math.min(wordCount - 1, Math.floor(firstMatch) + EXCERPT_WORDS);

  const parts: Highlighted["parts"] = [];
  // the last word's separator is kept only at the end of the text
  const end = last === wordCount - 1 ? tokens.length : last * 2 + 1;
  for (let i = first * 2; i < end; i++) {
    const match = isMatch(tokens[i], i);
    const previous = parts.at(-1);
    if (previous && !previous.match && !match) {
      previous.text += tokens[i];
    } else if (tokens[i]) {
      parts.push({ text: tokens[i], match });
    }
  }
  return { parts, before: first > 0, after: last < wordCount - 1 };
};

const chapterIndexes = new WeakMap<VerseText[], VerseIndex>();

/** Indexes a chapter's texts once per text list the page holds */
export const getChapterIndex = (texts: VerseText[]) => {
  let index = chapterIndexes.get(texts);
  if (!index) {
    index = buildIndex(texts);
    chapterIndexes.set(texts, index);
  }
  return index;
};

const packIndexes = new Map<string, Promise<VerseIndex>>();

/** Indexes a downloaded pack once per session. Fails, without keeping the failure, when it isn't downloaded. */
export const loadPackIndex = (pack: ContentPack, chapterIds: number[]) => {
  const key = packKey(pack);
  let index = packIndexes.get(key);
  if (!index) {
    index = readText(pack, chapterIds).then(buildIndex);
    index.catch(() => packIndexes.delete(key));
    packIndexes.set(key, index);
  }
  return index;
};

/** Forgets the pack indexes, for tests */
export const clearPackIndexes = () => packIndexes.clear();
