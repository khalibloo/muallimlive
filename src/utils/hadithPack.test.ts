import { fixture } from "@/components/test/hadithFixtures";

import {
  filterHadiths,
  formatHadithText,
  fromPack,
  getNeighbors,
  hadithPath,
  packBooks,
  toBookIndex,
} from "./hadithPack";

const FIXTURE_BOOKS = { bukhari: [1, 2, 13], muslim: [43], "abu-dawud": [7], malik: [4] };

describe("hadithPack", () => {
  it.each(Object.entries(FIXTURE_BOOKS).flatMap(([c, books]) => books.map((b) => [c, b] as const)))(
    "builds %s book %i's list like the data repo",
    (collection, book) => {
      const pack = fixture<HadithPack>(`${collection}/all`);
      expect(toBookIndex(pack.hadiths, book)).toEqual(
        fixture<GetHadithBookIndexResponse>(`${collection}/${book}/index`).hadiths,
      );
    },
  );

  it("groups a pack by book, in order", () => {
    const books = packBooks(fixture<HadithPack>("bukhari/all"));
    expect(books.map((b) => b.id)).toEqual([1, 2, 13]);
    expect(books[2].hadiths[0]).toBe("1");
  });

  it("links neighbors across book edges, keeping repeated ids apart", () => {
    const books = packBooks(fixture<HadithPack>("bukhari/all"));
    expect(getNeighbors(books, 1, "1")).toEqual({ next: { book: 1, id: "2" } });
    expect(getNeighbors(books, 2, "55")).toEqual({ previous: { book: 2, id: "54" }, next: { book: 13, id: "1" } });
    expect(getNeighbors(books, 13, "1")).toEqual({ previous: { book: 2, id: "55" }, next: { book: 13, id: "2" } });
    expect(getNeighbors(books, 13, "63").next).toBeUndefined();
  });

  it("builds paths with dotted ids", () => {
    expect(hadithPath({ collection: "malik", book: 4, id: "4.1.1" })).toBe("/hadiths/malik/4/4.1.1");
  });

  it("builds a hadith page's data from the pack", () => {
    const collection = {
      id: "muslim",
      name: "Sahih Muslim",
      booksCount: 1,
      hadithsCount: 40,
      books: [{ id: 43, name: "The Book of Commentary (Kitab Al-Tafsir)", hadithsCount: 40 }],
    };
    const packed = fixture<HadithPack>("muslim/all").hadiths.find((h) => h.id === "7188")!;
    expect(fromPack(collection, packed)).toEqual(fixture<Hadith>("muslim/43/7188"));
  });

  it("spells out the blessing token", () => {
    expect(formatHadithText("the Apostle of Allah (peace_be_upon_him) recited")).toBe(
      "the Apostle of Allah (peace be upon him) recited",
    );
  });

  it("filters a book's list by number or narrator", () => {
    const list = fixture<GetHadithBookIndexResponse>("bukhari/13/index").hadiths;
    expect(filterHadiths(list, "")).toBe(list);
    expect(filterHadiths(list, "Abu Hurai").every((h) => h.narrator?.includes("Abu Huraira"))).toBe(true);
    expect(filterHadiths(list, "63")[0].id).toBe("63");
  });
});
