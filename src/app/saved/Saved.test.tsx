import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { stubCaches, stubFetch } from "@/components/test/fakeCaches";
import { fixture, fixtureCollection, fixtureText } from "@/components/test/hadithFixtures";
import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import { addNote, hadithKey, readFaves, setFave, verseKey } from "@/utils/userData";
import Saved from "./Saved";

const chapter = (id: number, name: string, translation: string, versesCount: number): Chapter => ({
  id,
  revelation_place: "makkah",
  revelation_order: id,
  bismillah_pre: true,
  name_simple: name,
  name_complex: name,
  name_arabic: "",
  verses_count: versesCount,
  pages: [1],
  translated_name: { name: translation, language_name: "english" },
});

const chapters = [chapter(1, "Al-Fatihah", "The Opener", 7), chapter(112, "Al-Ikhlas", "The Sincerity", 4)];

const readerSettings: ReaderSettings = {
  splitView: true,
  left: [{ content: ["translation", "en", 20] }, { content: ["tafsir", "en", 169] }],
  right: [{ content: ["translation", "ar", "uthmani"] }],
};

const verses = (chapterId: number, count: number, text: (verse: number) => string, extra?: Partial<VerseText>) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    verse_key: `${chapterId}:${i + 1}`,
    text: text(i + 1),
    ...extra,
  }));

const responses = {
  "/api/content/translation/20/1": verses(1, 7, (v) => `Opener verse ${v}`),
  "/api/content/arabic/uthmani/1": verses(1, 7, (v) => `فاتحة ${v}`, { isArabic: true }),
  "/api/content/tafsir/169/1": verses(1, 7, (v) => `Opener tafsir ${v}`, { isTafsir: true }),
  "/api/content/translation/20/112": verses(112, 4, (v) => `Sincerity verse ${v}`),
  "/api/content/arabic/uthmani/112": verses(112, 4, (v) => `إخلاص ${v}`, { isArabic: true }),
  "/api/content/tafsir/169/112": verses(112, 4, (v) => `Sincerity tafsir ${v}`, { isTafsir: true }),
};

const hadiths: GetHadithResourcesResponse = {
  collections: [fixtureCollection("bukhari"), fixtureCollection("malik")],
};

const renderSaved = () => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      <Saved chapters={chapters} readerSettings={readerSettings} hadiths={hadiths} />
    </TestProviders>,
  );
  return user;
};

describe("Saved", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lists the favorite verses by chapter with their text", async () => {
    const fetchMock = stubFetch(responses);
    await setFave(verseKey(112, 3), true);
    await setFave(verseKey(1, 5), true);
    await setFave(verseKey(112, 1), true);
    renderSaved();

    const verse = await screen.findByRole("article", { name: "Verse 112:1" });
    expect(await within(verse).findByText("Sincerity verse 1")).toBeInTheDocument();
    expect(within(verse).getByText("إخلاص 1")).toBeInTheDocument();
    expect(within(verse).queryByText("Sincerity tafsir 1")).not.toBeInTheDocument();
    expect(within(verse).getByRole("link", { name: "Go to verse 112:1" })).toHaveAttribute("href", "/quran/112#v-1");

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["1. Al-Fatihah (The Opener)", "112. Al-Ikhlas (The Sincerity)"]);
    const names = screen.getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    expect(names).toEqual(["Verse 1:5", "Verse 112:1", "Verse 112:3"]);
    expect(await screen.findByText("Opener verse 5")).toBeInTheDocument();
    // tafsirs aren't shown, so their packs aren't fetched
    expect(fetchMock.mock.calls.map(([url]) => `${url}`).filter((url) => url.includes("tafsir"))).toEqual([]);
  });

  it("removes a verse when it's unfavorited", async () => {
    stubFetch(responses);
    await setFave(verseKey(112, 1), true);
    const user = renderSaved();

    const verse = await screen.findByRole("article", { name: "Verse 112:1" });
    await user.click(within(verse).getByRole("button", { name: "Remove from favorites" }));

    expect(await screen.findByText("You haven't added any favorites yet")).toBeInTheDocument();
    expect(await readFaves()).toEqual([]);
  });

  it("shows favorites added elsewhere", async () => {
    stubFetch(responses);
    renderSaved();

    expect(await screen.findByText("You haven't added any favorites yet")).toBeInTheDocument();
    await setFave(verseKey(1, 2), true);

    expect(await screen.findByRole("article", { name: "Verse 1:2" })).toBeInTheDocument();
    expect(await screen.findByText("Opener verse 2")).toBeInTheDocument();
  });

  it("lists the verses with notes and their notes", async () => {
    stubFetch(responses);
    await addNote(verseKey(112, 2), "<p>First thought</p>");
    await addNote(verseKey(112, 2), "<p>Second thought</p>");
    await addNote(verseKey(1, 1), "<p>Opening note</p>");
    const user = renderSaved();

    await user.click(await screen.findByRole("tab", { name: "Notes" }));

    const verse = await screen.findByRole("article", { name: "Verse 112:2" });
    expect(within(verse).getByText("First thought")).toBeInTheDocument();
    expect(within(verse).getByText("Second thought")).toBeInTheDocument();
    expect(await within(verse).findByText("Sincerity verse 2")).toBeInTheDocument();
    expect(within(verse).getByRole("button", { name: "Notes" })).toBeInTheDocument();
    const names = screen.getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    expect(names).toEqual(["Verse 1:1", "Verse 112:2"]);
  });

  it("shows notes written elsewhere", async () => {
    stubFetch(responses);
    const user = renderSaved();

    await user.click(await screen.findByRole("tab", { name: "Notes" }));
    expect(await screen.findByText("You haven't written any notes yet")).toBeInTheDocument();
    await addNote(verseKey(112, 4), "<p>Later note</p>");

    expect(await screen.findByText("Later note")).toBeInTheDocument();
  });

  it("still lists verses whose text can't be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await setFave(verseKey(112, 1), true);
    renderSaved();

    expect(await screen.findByRole("article", { name: "Verse 112:1" })).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });

  it("lists favorite hadiths after the verses, by collection and book", async () => {
    await setFave(verseKey(1, 1), true);
    await setFave(hadithKey({ collection: "bukhari", book: 13, id: "1" }), true);
    stubFetch({ "/api/hadiths/bukhari/13/1": fixture<Hadith>("bukhari/13/1") });
    renderSaved();

    const hadithSection = await screen.findByRole("region", { name: "Hadith" });
    expect(within(hadithSection).getByRole("heading", { level: 3, name: "Sahih al-Bukhari" })).toBeVisible();
    expect(within(hadithSection).getByRole("heading", { level: 4, name: "13. Friday Prayer" })).toBeVisible();
    const entry = within(hadithSection).getByRole("article", { name: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1" });
    expect(await within(entry).findByText(/We \(Muslims\) are the last/)).toBeVisible();
    expect(within(entry).getByRole("link", { name: "Volume 2, Book 13, Hadith 1" })).toHaveAttribute(
      "href",
      "/hadiths/bukhari/13/1",
    );
    expect(within(entry).getByText("Narrated by Abu Huraira")).toBeVisible();
  });

  it("reads a downloaded collection's texts from its pack", async () => {
    await setFave(hadithKey({ collection: "malik", book: 4, id: "4.1.1" }), true);
    stubCaches();
    await (await caches.open("content-packs")).put("/api/hadiths/malik", new Response(fixtureText("malik/all")));
    const fetchMock = stubFetch({});
    renderSaved();
    expect(await screen.findByText(/Shaytan/)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/hadiths/malik/4"));
  });

  it("says a hadith's text is unavailable offline without its pack", async () => {
    await setFave(hadithKey({ collection: "bukhari", book: 13, id: "1" }), true);
    stubCaches();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderSaved();
    expect(await screen.findByText("This hadith's text isn't downloaded for offline use.")).toBeVisible();
  });

  it("says a hadith's text couldn't be loaded while online", async () => {
    await setFave(hadithKey({ collection: "bukhari", book: 13, id: "1" }), true);
    stubCaches();
    stubFetch({});
    renderSaved();
    expect(await screen.findByText("This hadith's text couldn't be loaded. Try again later.")).toBeVisible();
    expect(screen.getByRole("article", { name: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1" })).toBeVisible();
  });

  it("says a hadith's text couldn't be loaded when its downloaded pack lacks it", async () => {
    await setFave(hadithKey({ collection: "malik", book: 4, id: "999" }), true);
    stubCaches();
    await (await caches.open("content-packs")).put("/api/hadiths/malik", new Response(fixtureText("malik/all")));
    stubFetch({});
    renderSaved();
    expect(await screen.findByText("This hadith's text couldn't be loaded. Try again later.")).toBeVisible();
  });

  it("orders the hadiths of a book by their numbers", async () => {
    await setFave(hadithKey({ collection: "bukhari", book: 13, id: "10" }), true);
    await setFave(hadithKey({ collection: "bukhari", book: 13, id: "2" }), true);
    stubFetch({});
    renderSaved();
    await screen.findByRole("region", { name: "Hadith" });
    expect(screen.getAllByRole("article").map((a) => a.getAttribute("aria-label"))).toEqual([
      "Sahih al-Bukhari, Volume 2, Book 13, Hadith 2",
      "Sahih al-Bukhari, Volume 2, Book 13, Hadith 10",
    ]);
  });

  it("lists hadith notes", async () => {
    await addNote(hadithKey({ collection: "bukhari", book: 13, id: "1" }), "<p>Friday</p>");
    stubFetch({ "/api/hadiths/bukhari/13/1": fixture<Hadith>("bukhari/13/1") });
    const user = renderSaved();
    await user.click(await screen.findByRole("tab", { name: "Notes" }));
    expect(await screen.findByText("Friday")).toBeVisible();
  });

  it("shows a noted hadith's real favorite state, not always favorited", async () => {
    await addNote(hadithKey({ collection: "bukhari", book: 13, id: "1" }), "<p>Friday</p>");
    stubFetch({ "/api/hadiths/bukhari/13/1": fixture<Hadith>("bukhari/13/1") });
    const user = renderSaved();
    await user.click(await screen.findByRole("tab", { name: "Notes" }));

    const entry = await screen.findByRole("article", { name: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1" });
    expect(within(entry).getByRole("button", { name: "Add to favorites" })).toBeInTheDocument();
  });

  it("skips hadiths of unknown collections", async () => {
    await setFave(hadithKey({ collection: "tirmidhi", book: 1, id: "1" }), true);
    renderSaved();
    expect(await screen.findByText("You haven't added any favorites yet")).toBeVisible();
  });
});
