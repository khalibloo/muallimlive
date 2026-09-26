import { stubCaches, stubFetch } from "@/components/test/fakeCaches";
import { downloadText } from "./offline";
import type { ContentPack } from "./packs";
import {
  buildIndex,
  getChapterIndex,
  highlight,
  loadPackIndex,
  normalizeTerm,
  searchIndexes,
  toPlainText,
} from "./search";

const text = (verseKey: string, value: string, extra?: Partial<VerseText>): VerseText => ({
  id: Number(verseKey.split(":")[1]),
  verse_key: verseKey,
  text: value,
  ...extra,
});

const translation = [
  text("2:153", "O you who have believed, seek help through patience and prayer."),
  text("2:155", "And We will surely test you with something of fear and hunger."),
  text("2:156", "Who, when disaster strikes them, say, Indeed we belong to Allah."),
];

const arabic = [
  text("1:1", "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ", { isArabic: true }),
  text("1:2", "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ", { isArabic: true }),
  text("1:5", "إِيَّاكَ نَعۡبُدُ وَإِيَّاكَ نَسۡتَعِينُ", { isArabic: true }),
];

describe("normalizeTerm", () => {
  it("lowercases and drops accents", () => {
    expect(normalizeTerm("Ṣalāh")).toBe("salah");
  });

  it("drops Arabic diacritics, tatweel and Qur'anic marks", () => {
    expect(normalizeTerm("ٱلرَّحۡمَٰنِ")).toBe("الرحمن");
    expect(normalizeTerm("رَبِّـــكَ")).toBe("ربك");
  });

  it("unifies the alef and yaa variants", () => {
    expect(normalizeTerm("إِيَّاكَ")).toBe("اياك");
    expect(normalizeTerm("ٱلۡهُدَىٰ")).toBe("الهدي");
  });
});

describe("toPlainText", () => {
  it("drops the tags and footnote numbers", () => {
    expect(toPlainText("In the name of Allah<sup foot_note=1>1</sup>, the <b>Merciful</b>")).toBe(
      "In the name of Allah, the Merciful",
    );
  });

  it("keeps words split by inline tags together and separates blocks", () => {
    expect(toPlainText('<tajweed class="ham_wasl">ٱ</tajweed>لۡحَمۡدُ')).toBe("ٱلۡحَمۡدُ");
    expect(toPlainText("<h2>Title</h2><p>First.</p><p>Second</p>")).toBe("Title First. Second");
  });
});

describe("searchIndexes", () => {
  const indexes = () => [{ key: "translation/20", index: buildIndex(translation) }];

  it("finds verses containing every word of the query", () => {
    const hits = searchIndexes(indexes(), "patience prayer");

    expect(hits.map((h) => h.verseKey)).toEqual(["2:153"]);
    expect(hits[0]).toMatchObject({ chapter: 2, verse: 153 });
    expect(hits[0].texts).toEqual([
      {
        key: "translation/20",
        text: "O you who have believed, seek help through patience and prayer.",
        terms: expect.arrayContaining(["patience", "prayer"]),
      },
    ]);
    expect(searchIndexes(indexes(), "patience hunger")).toEqual([]);
  });

  it("matches word beginnings and small misspellings", () => {
    expect(searchIndexes(indexes(), "patien").map((h) => h.verseKey)).toEqual(["2:153"]);
    expect(searchIndexes(indexes(), "disastor").map((h) => h.verseKey)).toEqual(["2:156"]);
  });

  it("finds Arabic words typed without diacritics", () => {
    const hits = searchIndexes([{ key: "arabic/uthmani", index: buildIndex(arabic) }], "الرحمن");

    expect(hits.map((h) => h.verseKey)).toEqual(["1:1"]);
    expect(searchIndexes([{ key: "arabic/uthmani", index: buildIndex(arabic) }], "اياك")[0].verseKey).toBe("1:5");
  });

  it("lists each verse once with every text that matches", () => {
    const other = [text("2:153", "O believers! Seek comfort in patience and prayer."), text("2:155", "Patience!")];
    const hits = searchIndexes([...indexes(), { key: "translation/57", index: buildIndex(other) }], "patience prayer");

    expect(hits).toHaveLength(1);
    expect(hits[0].texts.map((t) => t.key)).toEqual(["translation/20", "translation/57"]);
  });

  it("skips verses without text, and finds nothing for a blank query", () => {
    const index = buildIndex([text("1:1", ""), ...translation]);

    expect(index.documentCount).toBe(3);
    expect(searchIndexes([{ key: "translation/20", index }], "  ")).toEqual([]);
  });
});

describe("highlight", () => {
  it("marks the matched words", () => {
    expect(highlight("Seek help through Patience, and prayer.", ["patience", "prayer"])).toEqual({
      parts: [
        { text: "Seek help through ", match: false },
        { text: "Patience", match: true },
        { text: ", and ", match: false },
        { text: "prayer", match: true },
        { text: ".", match: false },
      ],
      before: false,
      after: false,
    });
  });

  it("marks Arabic words by their normalized form", () => {
    expect(highlight("بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ", ["الرحمن"]).parts).toEqual([
      { text: "بِسۡمِ ٱللَّهِ ", match: false },
      { text: "ٱلرَّحۡمَٰنِ", match: true },
    ]);
  });

  it("shortens long texts around the first match", () => {
    const words = Array.from({ length: 100 }, (_, i) => `w${i}`);
    words[60] = "mercy";

    const { parts, before, after } = highlight(words.join(" "), ["mercy"]);
    const shown = parts.map((p) => p.text).join("");

    expect(before).toBe(true);
    expect(after).toBe(true);
    expect(shown.startsWith("w35 ")).toBe(true);
    expect(shown.endsWith(" w85")).toBe(true);
    expect(parts.filter((p) => p.match)).toEqual([{ text: "mercy", match: true }]);
  });
});

describe("getChapterIndex", () => {
  it("indexes a text list once", () => {
    const index = getChapterIndex(translation);

    expect(index.documentCount).toBe(3);
    expect(getChapterIndex(translation)).toBe(index);
    expect(getChapterIndex([...translation])).not.toBe(index);
  });
});

describe("loadPackIndex", () => {
  const pack: ContentPack = { type: "translation", id: "30" };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("indexes a downloaded pack from the offline storage, once", async () => {
    stubCaches();
    const fetchMock = stubFetch({
      "/api/content/translation/30/1": [text("1:1", "In the name of Allah")],
      "/api/content/translation/30/2": [text("2:1", "Alif Lam Meem"), text("2:2", "This is the Book")],
    });
    await downloadText(pack, [1, 2]);
    fetchMock.mockClear();

    const index = await loadPackIndex(pack, [1, 2]);

    expect(index.documentCount).toBe(3);
    expect(await loadPackIndex(pack, [1, 2])).toBe(index);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails when a chapter isn't downloaded, and tries again next time", async () => {
    stubCaches();
    stubFetch({ "/api/content/translation/31/1": [text("1:1", "In the name of Allah")] });
    const missing: ContentPack = { type: "translation", id: "31" };

    await expect(loadPackIndex(missing, [1])).rejects.toThrow();
    await downloadText(missing, [1]);

    expect((await loadPackIndex(missing, [1])).documentCount).toBe(1);
  });
});
