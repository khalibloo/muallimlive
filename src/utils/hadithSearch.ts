import MiniSearch, { type Query, type SearchOptions, type SearchResult } from "minisearch";
import { stemmer } from "stemmer";
import { orderBy, uniq } from "lodash-es";

import type { HadithRef } from "./hadithPack";
import { readHadiths, readSynonyms } from "./offline";
import { normalizeTerm } from "./search";

// Hadith search, run in a worker (hadithSearch.worker.ts): one MiniSearch index per downloaded collection.
// Words are indexed both as written (normalized) and stemmed, so word forms match and typos in long words
// still do. Each query word also matches its synonyms, at a lower weight.

const APOSTROPHES = /['’‘ʿʾ`]/g;
const SEPARATORS = /[\n\r\p{Z}\p{P}]+/u;
const STOP_WORDS = new Set(
  "a an and are as at be but by for from had has have he her him his i in is it its of on or she so that the their them then there they this to was we were which who with you".split(
    " ",
  ),
);
const SYNONYM_BOOST = 0.5;

/** Apostrophes stand for Arabic letters, so "Mas'ud" is one word */
export const tokenize = (text: string) => text.replace(APOSTROPHES, "").split(SEPARATORS).filter(Boolean);

/** A word's index terms: normalized, and stemmed when that differs. Stop words aren't indexed. */
export const processHadithTerm = (word: string) => {
  const term = normalizeTerm(word);
  return !term || STOP_WORDS.has(term) ? null : uniq([term, stemmer(term)]);
};

/** Splits highlighted text into words the way hadiths are indexed: an apostrophe stays inside a word, e.g. "Qur'an" */
export const HADITH_WORD_SEPARATORS = /([\n\r\p{Z}]+|(?:(?!['’‘ʿʾ`])\p{P})+)/u;

/** A word's index terms for highlighting: apostrophes are ignored first, the same way the index treats them */
export const processHadithHighlightTerm = (word: string) => processHadithTerm(word.replace(APOSTROPHES, ""));

type Word = { raw: string; stem: string };

const toWords = (text: string): Word[] =>
  tokenize(text).flatMap((word) => {
    const terms = processHadithTerm(word);
    return terms ? [{ raw: terms[0], stem: terms.at(-1)! }] : [];
  });

interface SynonymIndex {
  groups: Word[][][];
  /** A single-word entry's group, by its raw and stemmed forms */
  byWord: Map<string, number>;
  /** Multi-word entries, longest first */
  phrases: { words: Word[]; group: number }[];
}

const toSynonymIndex = ({ groups }: HadithSynonyms): SynonymIndex => {
  const entries = groups.map((group) => group.map(toWords).filter((words) => words.length > 0));
  const byWord = new Map<string, number>();
  const phrases: SynonymIndex["phrases"] = [];
  entries.forEach((group, i) =>
    group.forEach((words) => {
      if (words.length === 1) {
        byWord.set(words[0].raw, i);
        byWord.set(words[0].stem, i);
      } else {
        phrases.push({ words, group: i });
      }
    }),
  );
  return { groups: entries, byWord, phrases: orderBy(phrases, (p) => p.words.length, "desc") };
};

const or = (queries: Query[]): Query => ({ combineWith: "OR", queries });
const and = (queries: Query[]): Query => ({ combineWith: "AND", queries });
/** An exact-only query: no prefix or fuzzy matching, even under an ancestor that allows them */
const exact = (queries: Query[]): Query => ({ combineWith: "AND", queries, fuzzy: false, prefix: false });
/** The typed word keeps prefix and typo matching; its stem, when it differs, matches exactly */
const wordQuery = (word: Word): Query => (word.raw === word.stem ? word.raw : or([word.raw, exact([word.stem])]));
const sameWords = (a: Word[], b: Word[]) => a.length === b.length && a.every((w, i) => w.stem === b[i].stem);

/** One query per typed word or known phrase: the words as typed, or any entry of their synonym group */
const toUnits = (query: string, synonyms: SynonymIndex) => {
  const words = toWords(query);
  const units: { query: Query; typedTerms: string[]; synonymTerms: string[] }[] = [];
  for (let i = 0; i < words.length;) {
    const phrase = synonyms.phrases.find((p) => p.words.every((w, j) => words[i + j]?.stem === w.stem));
    const typed = phrase ? words.slice(i, i + phrase.words.length) : [words[i]];
    const groupIndex = phrase
      ? phrase.group
      : (synonyms.byWord.get(words[i].raw) ?? synonyms.byWord.get(words[i].stem));
    const others = (groupIndex === undefined ? [] : synonyms.groups[groupIndex]).filter((e) => !sameWords(e, typed));
    units.push({
      query: or([and(typed.map(wordQuery)), ...others.map((entry) => exact(entry.map((w) => w.stem)))]),
      typedTerms: typed.flatMap((w) => [w.raw, w.stem]),
      synonymTerms: others.flatMap((entry) => entry.map((w) => w.stem)),
    });
    i += typed.length;
  }
  return units;
};

type IndexedHadith = { id: string; text: string; narrators: string };

interface CollectionIndex {
  index: MiniSearch<IndexedHadith>;
  /** By doc id, `<book>/<id>`, since ids repeat across Bukhari's books */
  docs: Map<string, PackedHadith>;
}

const buildIndex = (pack: HadithPack): CollectionIndex => {
  const index = new MiniSearch<IndexedHadith>({
    fields: ["text", "narrators"],
    tokenize,
    processTerm: processHadithTerm,
  });
  const docs = new Map(pack.hadiths.map((h) => [`${h.book}/${h.id}`, h]));
  index.addAll(
    [...docs].map(([id, h]) => ({ id, text: h.text.join("\n"), narrators: (h.narrators ?? []).join("\n") })),
  );
  return { index, docs };
};

const indexes = new Map<string, Promise<CollectionIndex>>();
let synonymIndex: Promise<SynonymIndex> | undefined;

/** Indexes a downloaded collection once per session. Fails, without keeping the failure, when it isn't downloaded. */
const getIndex = (collection: string) => {
  let index = indexes.get(collection);
  if (!index) {
    index = readHadiths(collection).then(buildIndex);
    index.catch(() => indexes.delete(collection));
    indexes.set(collection, index);
  }
  return index;
};

const getSynonymIndex = () => (synonymIndex ??= readSynonyms().then(toSynonymIndex));

export const clearHadithIndexes = () => {
  indexes.clear();
  synonymIndex = undefined;
};

/** The query terms are already processed, so tokenize and processTerm here are identity: nothing more is split off, and each term is kept as is */
const SEARCH_OPTIONS: SearchOptions = {
  prefix: true,
  fuzzy: (term) => (term.length > 4 ? 0.2 : false),
  maxFuzzy: 2,
  boost: { narrators: 2 },
  // typo matches weigh less than exact and synonym matches
  weights: { fuzzy: 0.1, prefix: 0.375 },
  tokenize: (term) => [term],
  processTerm: (term) => term,
};

export interface HadithHit extends HadithRef {
  volume?: number;
  narrators?: string[];
  text: string;
  /** The index terms that matched, for highlighting */
  terms: string[];
  score: number;
}

export interface HadithSearchResult {
  /** Hadiths matching every word, best first */
  matches: HadithHit[];
  /** Hadiths matching only some words */
  partial: HadithHit[];
  matchCount: number;
  partialCount: number;
}

export interface HadithSearchRequest {
  collections: string[];
  query: string;
  /** Only with a single collection */
  book?: number;
  narrator?: string;
  /** How many hits to return, matches first */
  limit: number;
}

export type HadithSearchMessage =
  ({ type: "search" } & HadithSearchRequest) | { type: "narrators"; collections: string[] };

const EMPTY: HadithSearchResult = { matches: [], partial: [], matchCount: 0, partialCount: 0 };

const search = async ({ collections, query, book, narrator, limit }: HadithSearchRequest) => {
  const units = toUnits(query, await getSynonymIndex());
  if (units.length === 0) {
    return EMPTY;
  }
  const synonymTerms = new Set(units.flatMap((u) => u.synonymTerms));
  const typedTerms = new Set(units.flatMap((u) => u.typedTerms));
  // a term both typed and a synonym keeps full weight
  const boostTerm = (term: string) => (synonymTerms.has(term) && !typedTerms.has(term) ? SYNONYM_BOOST : 1);
  const matches: HadithHit[] = [];
  const partial: HadithHit[] = [];
  for (const collection of collections) {
    const { index, docs } = await getIndex(collection);
    const toHit = (result: SearchResult): HadithHit => {
      const h = docs.get(`${result.id}`)!;
      return {
        collection,
        book: h.book,
        id: h.id,
        volume: h.volume,
        narrators: h.narrators,
        text: h.text.join(" "),
        terms: result.terms,
        score: result.score,
      };
    };
    const options: SearchOptions = {
      ...SEARCH_OPTIONS,
      boostTerm,
      filter: (result) => {
        const h = docs.get(`${result.id}`)!;
        return (!book || h.book === book) && (!narrator || !!h.narrators?.includes(narrator));
      },
    };
    const all = index.search(and(units.map((u) => u.query)), options);
    const ids = new Set(all.map((r) => r.id));
    matches.push(...all.map(toHit));
    if (units.length > 1) {
      partial.push(
        ...index
          .search(or(units.map((u) => u.query)), options)
          .filter((r) => !ids.has(r.id))
          .map(toHit),
      );
    }
  }
  const sortedMatches = orderBy(matches, "score", "desc");
  const sortedPartial = orderBy(partial, "score", "desc");
  return {
    matches: sortedMatches.slice(0, limit),
    partial: sortedPartial.slice(0, Math.max(0, limit - sortedMatches.length)),
    matchCount: sortedMatches.length,
    partialCount: sortedPartial.length,
  };
};

const listNarrators = async (collections: string[]) =>
  uniq(
    (await Promise.all(collections.map(getIndex))).flatMap(({ docs }) =>
      [...docs.values()].flatMap((h) => h.narrators ?? []),
    ),
  ).sort();

export const handleMessage = (message: HadithSearchMessage) =>
  message.type === "narrators" ? listNarrators(message.collections) : search(message);
