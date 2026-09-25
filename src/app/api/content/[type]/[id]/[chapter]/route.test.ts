import { getChapters, getVerseRecitations, getVerseTexts } from "@/utils/content";
import { GET } from "./route";

vi.mock("@/utils/content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/content")>()),
  getChapters: vi.fn(),
  getVerseTexts: vi.fn(),
  getVerseRecitations: vi.fn(),
}));

const chapter = { id: 1, verses_count: 7 } as Chapter;

const get = (type: string, id: string, chapterId: string) =>
  GET(new Request("http://localhost"), { params: Promise.resolve({ type, id, chapter: chapterId }) });

describe("GET /api/content/[type]/[id]/[chapter]", () => {
  beforeEach(() => {
    vi.mocked(getChapters).mockResolvedValue({ chapters: [chapter] });
  });

  it.each([
    ["arabic", "uthmani"],
    ["translation", "20"],
    ["tafsir", "169"],
  ] as const)("serves a chapter of a %s pack with long-lived cache headers", async (type, id) => {
    const texts = [{ id: 1, verse_key: "1:1", text: "Text" }];
    vi.mocked(getVerseTexts).mockResolvedValue(texts);

    const response = await get(type, id, "1");

    await expect(response.json()).resolves.toEqual(texts);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400, s-maxage=31536000");
    expect(getVerseTexts).toHaveBeenCalledWith({ type, id }, chapter);
  });

  it("serves a chapter's recitation files", async () => {
    const files = [{ id: 1, verse_key: "1:1", url: "https://audio.test/1.mp3" }];
    vi.mocked(getVerseRecitations).mockResolvedValue(files);

    const response = await get("recitation", "7", "1");

    await expect(response.json()).resolves.toEqual(files);
    expect(getVerseRecitations).toHaveBeenCalledWith("7", 1);
  });

  it.each([
    ["an unknown Arabic script", "arabic", "latin", "1"],
    ["a non-numeric id", "translation", "../secrets", "1"],
    ["an unknown chapter", "translation", "20", "115"],
    ["an unknown content type", "hadith", "20", "1"],
  ])("is not found for %s", async (_, type, id, chapterId) => {
    await expect(get(type, id, chapterId)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(getVerseTexts).not.toHaveBeenCalled();
  });
});
