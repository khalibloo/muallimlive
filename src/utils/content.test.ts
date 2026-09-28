import { getVerseRecitations, getVerseTexts } from "./content";
import { fetchData } from "./fetcher";

vi.mock("./fetcher", () => ({ fetchData: vi.fn() }));

const chapter = { id: 1, verses_count: 3 } as Chapter;

describe("getVerseTexts", () => {
  it("reads the Arabic script's text field", async () => {
    vi.mocked(fetchData).mockResolvedValue({
      verses: [{ id: 5, verse_key: "1:1", text_indopak: "بِسْمِ" }],
    });

    await expect(getVerseTexts({ type: "arabic", id: "indopak" }, chapter)).resolves.toEqual([
      { id: 5, isArabic: true, isHTML: true, verse_key: "1:1", text: "بِسْمِ" },
    ]);
    expect(fetchData).toHaveBeenCalledWith("chapters/1/arabic/indopak");
  });

  it("numbers translations by verse", async () => {
    vi.mocked(fetchData).mockResolvedValue({ translations: [{ text: "One" }, { text: "Two<sup>1</sup>" }] });

    await expect(getVerseTexts({ type: "translation", id: "20" }, chapter)).resolves.toEqual([
      { id: 1, verse_key: "1:1", text: "One", isHTML: true },
      { id: 2, verse_key: "1:2", text: "Two<sup>1</sup>", isHTML: true },
    ]);
    expect(fetchData).toHaveBeenCalledWith("chapters/1/translations/20");
  });

  it("keeps a transliteration's word glosses", async () => {
    const words = [{ text: "Bismi", translation: "In the name of" }, { text: "Allāhi" }];
    vi.mocked(fetchData).mockResolvedValue({ translations: [{ text: "Bismi Allāhi", words }] });

    await expect(getVerseTexts({ type: "translation", id: "0" }, chapter)).resolves.toEqual([
      { id: 1, verse_key: "1:1", text: "Bismi Allāhi", isHTML: true, words },
    ]);
  });

  it("fills in the verses a tafsir skips", async () => {
    vi.mocked(fetchData).mockResolvedValue({ tafsirs: [{ verse_id: 2, text: "<p>Two</p>" }] });

    await expect(getVerseTexts({ type: "tafsir", id: "169" }, chapter)).resolves.toEqual([
      { id: 1, verse_key: "1:1", text: "" },
      { id: 2, verse_key: "1:2", text: "<p>Two</p>", isHTML: true, isTafsir: true },
      { id: 3, verse_key: "1:3", text: "" },
    ]);
    expect(fetchData).toHaveBeenCalledWith("chapters/1/tafsirs/169");
  });
});

describe("getVerseRecitations", () => {
  it("points the recitation files at the audio host", async () => {
    vi.mocked(fetchData).mockResolvedValue({ audio_files: [{ id: 1, verse_key: "1:1", url: "Alafasy/001001.mp3" }] });

    await expect(getVerseRecitations(7, 1)).resolves.toEqual([
      { id: 1, verse_key: "1:1", url: "https://audio.test/Alafasy/001001.mp3" },
    ]);
    expect(fetchData).toHaveBeenCalledWith("chapters/1/recitations/7");
  });
});
