import { contentUrl, getContentPack, hadithPackUrl, hadithUrl, packKey, recitationUrl, resourceUrl } from "./packs";

describe("getContentPack", () => {
  it.each<[VerseLayoutItem["content"], ReturnType<typeof getContentPack>]>([
    [["translation", "ar", "uthmani"], { type: "arabic", id: "uthmani" }],
    [["translation", "en", 20], { type: "translation", id: "20" }],
    [["tafsir", "en", 169], { type: "tafsir", id: "169" }],
    [undefined, undefined],
  ])("maps %j to its pack", (content, pack) => {
    expect(getContentPack({ content })).toEqual(pack);
  });
});

describe("pack URLs", () => {
  it("builds the API URLs the packs are stored under", () => {
    const pack = { type: "tafsir", id: "169" } as const;

    expect(packKey(pack)).toBe("tafsir/169");
    expect(contentUrl(pack, 2)).toBe("/api/content/tafsir/169/2");
    expect(recitationUrl(7, 2)).toBe("/api/content/recitation/7/2");
    expect(resourceUrl("chapters")).toBe("/api/resources/chapters");
  });

  it("builds the hadith URLs", () => {
    expect(hadithPackUrl("abu-dawud")).toBe("/api/hadiths/abu-dawud");
    expect(hadithUrl({ collection: "malik", book: 4, id: "4.1.1" })).toBe("/api/hadiths/malik/4/4.1.1");
    expect(resourceUrl("hadiths")).toBe("/api/resources/hadiths");
  });
});
