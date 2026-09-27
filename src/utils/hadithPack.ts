import Fuse from "fuse.js";
import { groupBy } from "lodash-es";

// Pure helpers shared by the hadith pages, the offline page and the search

export interface HadithPosition {
  book: number;
  id: string;
}

export interface HadithRef extends HadithPosition {
  collection: string;
}

export const hadithPath = ({ collection, book, id }: HadithRef) => `/hadiths/${collection}/${book}/${id}`;

const EXCERPT_LENGTH = 150;

/** The data repo's excerpt: the start of the text, cut at a word boundary at or before 150 characters */
const toExcerpt = (text: string[]): Pick<HadithIndexEntry, "excerpt" | "truncated"> => {
  const whole = text.join(" ");
  if (whole.length <= EXCERPT_LENGTH) {
    return { excerpt: whole };
  }
  const space = whole.lastIndexOf(" ", EXCERPT_LENGTH);
  return { excerpt: whole.slice(0, space > 0 ? space : EXCERPT_LENGTH).trimEnd(), truncated: true };
};

/** A book's list, as its index.json, from the collection pack */
export const toBookIndex = (hadiths: PackedHadith[], book: number): HadithIndexEntry[] =>
  hadiths.filter((h) => h.book === book).map((h) => ({ id: h.id, narrator: h.narrators?.[0], ...toExcerpt(h.text) }));

export const packBooks = (pack: HadithPack) =>
  Object.values(groupBy(pack.hadiths, "book"))
    .map((hadiths) => ({
      id: hadiths[0].book,
      hadiths: hadiths.map((h) => h.id),
    }))
    .sort((a, b) => a.id - b.id);

/** The hadiths before and after one, crossing into the neighboring books */
export const getNeighbors = (books: { id: number; hadiths: string[] }[], book: number, id: string) => {
  const all = books.flatMap((b) => b.hadiths.map((h) => ({ book: b.id, id: h })));
  const i = all.findIndex((h) => h.book === book && h.id === id);
  return {
    ...(i > 0 && { previous: all[i - 1] }),
    ...(i >= 0 && i < all.length - 1 && { next: all[i + 1] }),
  } as { previous?: HadithPosition; next?: HadithPosition };
};

/** A hadith page's data, from a downloaded pack */
export const fromPack = (collection: HadithResourceCollection, hadith: PackedHadith): Hadith => ({
  id: hadith.id,
  collection: collection.id,
  collectionName: collection.name,
  book: hadith.book,
  bookName: collection.books.find((b) => b.id === hadith.book)?.name ?? "",
  volume: hadith.volume,
  narrators: hadith.narrators,
  text: hadith.text,
});

export const formatHadithText = (paragraph: string) =>
  paragraph.replaceAll("(peace_be_upon_him)", "(peace be upon him)");

/** Fuzzy matches the hadith number and the first narrator, like the chapter names */
export const filterHadiths = (hadiths: HadithIndexEntry[], query: string) =>
  query.trim()
    ? new Fuse(hadiths, { keys: ["id", "narrator"], ignoreLocation: true, threshold: 0.1 })
        .search(query.trim())
        .map((result) => result.item)
    : hadiths;
