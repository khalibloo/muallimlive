import { useEffect } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { VirtuosoMockContext } from "react-virtuoso";

import { stubCaches, stubFetch } from "@/components/test/fakeCaches";
import { hadithResources } from "@/components/test/hadithFixtures";
import TestProviders from "@/components/test/TestProviders";
import { downloadText } from "@/utils/offline";
import { clearPackIndexes } from "@/utils/search";
import {
  ChapterSearchProvider,
  useSetCurrentChapter,
  type CurrentChapter,
  type SearchMode,
} from "./ChapterSearchContext";
import SearchModal from "./SearchModal";

vi.mock("@/utils/hadithSearchClient", () => ({
  HadithSearchStopped: class extends Error {},
  searchHadiths: vi.fn(),
  listNarrators: vi.fn().mockResolvedValue([]),
}));

const chapters = {
  chapters: [
    { id: 1, name_simple: "Al-Fatihah", translated_name: { name: "The Opener" }, verses_count: 7 },
    { id: 2, name_simple: "Al-Baqarah", translated_name: { name: "The Cow" }, verses_count: 286 },
  ],
} as GetChaptersResponse;
const translations = {
  translations: [{ id: 20, translated_name: { name: "Saheeh International" } }],
} as GetTranslationsResponse;
const tafsirs = { tafsirs: [{ id: 169, translated_name: { name: "Ibn Kathir" } }] } as GetTafsirsResponse;
const readerSettings: ReaderSettings = {
  splitView: true,
  left: [{ content: ["translation", "ar", "uthmani"] }, { content: ["translation", "en", 20] }],
  right: [{ content: ["tafsir", "en", 169] }],
};

const text = (verseKey: string, value: string, extra?: Partial<VerseText>): VerseText => ({
  id: Number(verseKey.split(":")[1]),
  verse_key: verseKey,
  text: value,
  isHTML: true,
  ...extra,
});

const translation1 = [text("1:1", "In the name of Allah, the Entirely Merciful"), text("1:2", "Praise be to Allah")];
const translation2 = [
  text("2:153", "O you who have believed, seek help through <b>patience</b> and prayer."),
  text("2:155", "And We will surely test you with something of fear and hunger."),
];
const tafsir2 = [text("2:153", "<p>Allah commands patience in hardship.</p>", { isTafsir: true })];
const arabic1 = [text("1:1", "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ", { isArabic: true })];

const responses = {
  "/api/content/translation/20/1": translation1,
  "/api/content/translation/20/2": translation2,
  "/api/content/arabic/uthmani/1": arabic1,
  "/api/content/arabic/uthmani/2": [],
};

const RegisterChapter: React.FC<{ current: CurrentChapter }> = ({ current }) => {
  const setCurrent = useSetCurrentChapter();
  useEffect(() => {
    setCurrent(current);
    return () => setCurrent(undefined);
  }, [current]);
  return null;
};

const renderModal = (current?: CurrentChapter, mode: SearchMode = "quran") => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(
    <TestProviders>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <VirtuosoMockContext.Provider value={{ viewportHeight: 1000, itemHeight: 100 }}>
          <ChapterSearchProvider>
            {current && <RegisterChapter current={current} />}
            <SearchModal
              open
              onClose={onClose}
              mode={mode}
              hadiths={hadithResources}
              chapters={chapters}
              translations={translations}
              tafsirs={tafsirs}
            />
          </ChapterSearchProvider>
        </VirtuosoMockContext.Provider>
      </ConfigProvider>
    </TestProviders>,
  );
  return { user, onClose };
};

const baqarah = (verses = translation2): CurrentChapter => ({
  chapter: chapters.chapters[1],
  texts: [
    { pack: { type: "translation", id: "20" }, verses },
    { pack: { type: "tafsir", id: "169" }, verses: tafsir2 },
  ],
  goToVerse: vi.fn(),
});

const search = async (user: ReturnType<typeof userEvent.setup>, query: string) => {
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), query);
};

describe("SearchModal", () => {
  beforeEach(() => {
    clearPackIndexes();
    document.cookie = `reader-settings=${encodeURIComponent(JSON.stringify(readerSettings))}`;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens in the mode it's given and switches between them", async () => {
    stubCaches();
    const { user } = renderModal(undefined, "hadith");
    await vi.waitFor(() => expect(screen.getByRole("combobox", { name: "Collection" })).toBeVisible());
    await user.click(screen.getByText("Qur'an"));
    expect(screen.queryByRole("combobox", { name: "Collection" })).toBeNull();
  });

  describe("in a chapter", () => {
    it("searches the chapter's texts, tafsirs included, and highlights the matches", async () => {
      const { user } = renderModal(baqarah());

      expect(screen.getByRole("dialog", { name: "Search" })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "Only Al-Baqarah" })).toBeChecked();
      await vi.waitFor(() => expect(screen.getByRole("searchbox", { name: "Search words" })).toHaveFocus());
      await search(user, "patience");

      const result = await screen.findByRole("article", { name: "Verse 2:153" });
      expect(screen.getByText("1 verse")).toBeInTheDocument();
      expect(within(result).getByRole("link", { name: "Al-Baqarah 2:153" })).toHaveAttribute(
        "href",
        "/chapters/2#v-153",
      );
      expect(within(result).getByText("Saheeh International")).toBeInTheDocument();
      expect(within(result).getByText("Ibn Kathir")).toBeInTheDocument();
      expect(within(result).getAllByText("patience", { selector: "mark" })).toHaveLength(2);
    });

    it("leaves out the texts the reader unticks", async () => {
      const { user } = renderModal(baqarah());

      await user.click(screen.getByRole("checkbox", { name: "Ibn Kathir" }));
      await search(user, "hardship");

      expect(await screen.findByText("No verses found")).toBeInTheDocument();
    });

    it("asks for a text when every text is unticked", async () => {
      const { user } = renderModal(baqarah());

      await user.click(screen.getByRole("checkbox", { name: "Saheeh International" }));
      await user.click(screen.getByRole("checkbox", { name: "Ibn Kathir" }));

      expect(screen.getByText("Choose at least one text to search.")).toBeInTheDocument();
    });

    it("scrolls to a verse of the chapter instead of navigating", async () => {
      const current = baqarah();
      const { user, onClose } = renderModal(current);

      await search(user, "hunger");
      await user.click(await screen.findByRole("link", { name: "Al-Baqarah 2:155" }));

      expect(current.goToVerse).toHaveBeenCalledWith(155);
      expect(onClose).toHaveBeenCalled();
    });

    it("counts every result but only renders the ones in view", async () => {
      const verses = Array.from({ length: 60 }, (_, i) => text(`2:${i + 1}`, `Verse about mercy ${i}`));
      const { user } = renderModal(baqarah(verses));

      await search(user, "mercy");

      expect(await screen.findByRole("status")).toHaveTextContent("60 verses");
      expect(screen.getAllByRole("article").length).toBeLessThan(60);
    });
  });

  describe("in the whole Qur'an", () => {
    beforeEach(async () => {
      stubCaches();
      stubFetch(responses);
      await downloadText({ type: "translation", id: "20" }, [1, 2]);
    });

    it("searches the downloaded texts of the display settings", async () => {
      const { user } = renderModal();

      expect(screen.queryByRole("checkbox", { name: /^Only/ })).not.toBeInTheDocument();
      expect(await screen.findByRole("checkbox", { name: "Saheeh International" })).toBeChecked();
      expect(screen.getByText("Tafsirs are only searched within a chapter.")).toBeInTheDocument();
      await search(user, "allah");

      expect(await screen.findByText("2 verses")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Al-Fatihah 1:1" })).toHaveAttribute("href", "/chapters/1#v-1");
      expect(screen.getByRole("link", { name: "Al-Fatihah 1:2" })).toBeInTheDocument();
    });

    it("searches the whole Qur'an when the reader unticks the chapter", async () => {
      const { user } = renderModal(baqarah());

      await user.click(screen.getByRole("checkbox", { name: "Only Al-Baqarah" }));
      await search(user, "allah");

      expect(await screen.findByText("2 verses")).toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: "Ibn Kathir" })).not.toBeInTheDocument();
    });

    it("offers to download a text before searching it", async () => {
      const { user } = renderModal();

      expect(await screen.findByText("Download a text to search it across the whole Qur'an.")).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "Uthmani Script" })).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "Download Uthmani Script" }));

      const arabic = await screen.findByRole("checkbox", { name: "Uthmani Script" });
      await vi.waitFor(() => expect(arabic).toBeEnabled());
      expect(arabic).toBeChecked();
      await search(user, "الرحيم");
      expect(await screen.findByRole("article", { name: "Verse 1:1" })).toBeInTheDocument();
    });

    it("explains that browsers without offline storage can only search a chapter", () => {
      vi.unstubAllGlobals();
      renderModal();

      expect(
        screen.getByText(
          "This browser can't store the texts needed to search the whole Qur'an. Open a chapter to search it.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    });
  });
});
