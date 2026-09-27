import { act, renderHook } from "@testing-library/react";

import { stubCaches, stubFetch } from "@/components/test/fakeCaches";
import {
  downloadAudio,
  downloadHadiths,
  downloadText,
  getDownloadStatus,
  isOfflineStorageSupported,
  removeAudio,
  removeHadiths,
  removeText,
  useDownloads,
} from "./offline";
import { readHadiths, readSynonyms } from "./hadithCache";
import type { ContentPack } from "./packs";

const translation: ContentPack = { type: "translation", id: "20" };
const tafsir: ContentPack = { type: "tafsir", id: "169" };

const recitation = (chapter: number, verses: number) =>
  Array.from({ length: verses }, (_, i) => ({
    id: i + 1,
    verse_key: `${chapter}:${i + 1}`,
    url: `https://audio.test/${chapter}_${i + 1}.mp3`,
  }));

const responses = {
  "/api/content/translation/20/1": [{ id: 1, verse_key: "1:1", text: "One" }],
  "/api/content/translation/20/2": [{ id: 1, verse_key: "2:1", text: "Two" }],
  "/api/content/tafsir/169/1": [{ id: 1, verse_key: "1:1", text: "Tafsir" }],
  "/api/content/recitation/7/1": recitation(1, 2),
  "/api/content/recitation/7/2": recitation(2, 1),
  "/1_1.mp3": {},
  "/1_2.mp3": {},
  "/2_1.mp3": {},
};

describe("offline downloads", () => {
  beforeEach(() => {
    stubCaches();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects Cache Storage support", () => {
    expect(isOfflineStorageSupported()).toBe(true);

    vi.unstubAllGlobals();

    expect(isOfflineStorageSupported()).toBe(false);
  });

  it("downloads every chapter of a text pack and reports progress", async () => {
    stubFetch(responses);
    const { result } = renderHook(() => useDownloads());

    let download: Promise<void>;
    act(() => {
      download = downloadText(translation, [1, 2]);
    });
    expect(result.current).toEqual({ "translation/20": 0 });
    await act(() => download);

    expect(result.current).toEqual({});
    await expect(getDownloadStatus()).resolves.toEqual({ text: { "translation/20": 2 }, audio: {}, hadiths: [] });
  });

  it("skips chapters that are already downloaded and downloads already running", async () => {
    const fetchMock = stubFetch(responses);
    await downloadText(translation, [1]);
    fetchMock.mockClear();

    await Promise.all([downloadText(translation, [1, 2]), downloadText(translation, [1, 2])]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(getDownloadStatus()).resolves.toMatchObject({ text: { "translation/20": 2 } });
  });

  it("fails a download when a chapter can't be fetched, keeping the chapters already stored", async () => {
    stubFetch(responses);
    const { result } = renderHook(() => useDownloads());

    await act(() => expect(downloadText(translation, [1, 3])).rejects.toThrow());

    expect(result.current).toEqual({});
    await expect(getDownloadStatus()).resolves.toMatchObject({ text: { "translation/20": 1 } });
  });

  it("removes only the chosen text pack", async () => {
    stubFetch(responses);
    await downloadText(translation, [1, 2]);
    await downloadText(tafsir, [1]);

    await removeText(translation);

    await expect(getDownloadStatus()).resolves.toEqual({ text: { "tafsir/169": 1 }, audio: {}, hadiths: [] });
  });

  it("downloads a reciter's audio files and marks the chapters downloaded", async () => {
    const fetchMock = stubFetch(responses);

    await downloadAudio(7, [1, 2]);

    await expect(getDownloadStatus()).resolves.toEqual({ text: {}, audio: { 7: [1, 2] }, hadiths: [] });
    for (const file of ["https://audio.test/1_1.mp3", "https://audio.test/1_2.mp3", "https://audio.test/2_1.mp3"]) {
      expect(fetchMock).toHaveBeenCalledWith(file);
    }
  });

  it("leaves a chapter unmarked when one of its audio files fails", async () => {
    const { "/1_2.mp3": _, ...rest } = responses;
    stubFetch(rest);

    await expect(downloadAudio(7, [1])).rejects.toThrow();

    await expect(getDownloadStatus()).resolves.toEqual({ text: {}, audio: {}, hadiths: [] });
  });

  it("fails an audio download when a recitation list can't be fetched", async () => {
    stubFetch(responses);

    await expect(downloadAudio(8, [1])).rejects.toThrow("Failed to fetch /api/content/recitation/8/1: 404");
  });

  it("removes a reciter's audio for the chosen chapters", async () => {
    const caches = stubCaches();
    stubFetch(responses);
    await downloadAudio(7, [1, 2]);

    await removeAudio(7, [1, 3]);

    await expect(getDownloadStatus()).resolves.toEqual({ text: {}, audio: { 7: [2] }, hadiths: [] });
    const urls = [...caches.get("audio-packs")!.entries.keys()];
    expect(urls).toEqual(["https://audio.test/2_1.mp3", `${window.location.origin}/api/content/recitation/7/2`]);
  });
});

describe("hadith packs", () => {
  const pack = { hadiths: [{ id: "1", book: 13, text: ["text"] }] };
  const synonyms = { groups: [["salat", "prayer"]] };

  it("downloads a collection with the synonyms and reads it back", async () => {
    stubCaches();
    stubFetch({ "/api/hadiths/bukhari": pack, "/api/hadiths/synonyms": synonyms });
    await downloadHadiths("bukhari");
    await expect(readHadiths("bukhari")).resolves.toEqual(pack);
    await expect(readSynonyms()).resolves.toEqual(synonyms);
    await expect(getDownloadStatus()).resolves.toMatchObject({ hadiths: ["bukhari"], text: {} });
  });

  it("fails to read a collection that isn't downloaded, and has no synonyms yet", async () => {
    stubCaches();
    await expect(readHadiths("malik")).rejects.toThrow("malik isn't downloaded");
    await expect(readSynonyms()).resolves.toEqual({ groups: [] });
  });

  it("removes a collection but keeps the shared synonyms", async () => {
    stubCaches();
    stubFetch({ "/api/hadiths/bukhari": pack, "/api/hadiths/synonyms": synonyms });
    await downloadHadiths("bukhari");
    await removeHadiths("bukhari");
    await expect(getDownloadStatus()).resolves.toMatchObject({ hadiths: [] });
    await expect(readSynonyms()).resolves.toEqual(synonyms);
  });
});
