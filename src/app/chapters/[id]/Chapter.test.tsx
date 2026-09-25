import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";

import TestProviders from "@/components/test/TestProviders";
import { savePlayerSettings } from "@/components/savePlayerSettings";
import lf from "@/utils/localforage";
import Chapter from "./Chapter";

const { scrollToIndex } = vi.hoisted(() => ({ scrollToIndex: vi.fn() }));

// renders every item so all verses are reachable, and exposes a spy for programmatic scrolling
vi.mock("react-virtuoso", async () => {
  const { forwardRef, useImperativeHandle } = await import("react");
  return {
    Virtuoso: forwardRef(function Virtuoso(
      { data, itemContent }: { data: unknown[]; itemContent: (index: number, item: unknown) => React.ReactNode },
      ref,
    ) {
      useImperativeHandle(ref, () => ({ scrollToIndex }));
      return (
        <div>
          {data.map((item, i) => (
            <div key={i}>{itemContent(i, item)}</div>
          ))}
        </div>
      );
    }),
  };
});

vi.mock("@/components/savePlayerSettings", () => ({
  savePlayerSettings: vi.fn(),
}));

const chapter = (id: number, nameSimple: string, translatedName: string, versesCount: number): Chapter => ({
  id,
  revelation_place: "makkah",
  revelation_order: id,
  bismillah_pre: true,
  name_simple: nameSimple,
  name_complex: nameSimple,
  name_arabic: "",
  verses_count: versesCount,
  pages: [1],
  translated_name: { name: translatedName, language_name: "english" },
});

const alFatihah = chapter(1, "Al-Fatihah", "The Opener", 3);
const chapters = { chapters: [alFatihah, chapter(2, "Al-Baqarah", "The Cow", 286)] };

const verseText = (n: number, text: string, extra: Partial<VerseText> = {}): VerseText => ({
  id: n,
  verse_key: `1:${n}`,
  text,
  ...extra,
});

const leftContent = [
  [verseText(1, "Translation one"), verseText(2, "Translation two"), verseText(3, "Translation three")],
  [
    verseText(1, "<p>Tafsir one</p>", { isHTML: true, isTafsir: true }),
    verseText(2, "<p>Tafsir two</p>", { isHTML: true, isTafsir: true }),
    verseText(3, "<p>Tafsir three</p>", { isHTML: true, isTafsir: true }),
  ],
];
const rightContent = [[verseText(1, "Arabic one"), verseText(2, "Arabic two"), verseText(3, "Arabic three")]];

const versesRecitations = [1, 2, 3].map((n) => ({ id: n, verse_key: `1:${n}`, url: `https://audio.test/1_${n}.mp3` }));

const recitations: GetRecitationsResponse = {
  recitations: [{ id: 1, reciter_name: "Reciter", style: "", translated_name: { name: "Reciter", language_name: "" } }],
};

const renderChapter = (notice?: React.ReactNode, chapterList = chapters) => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      {/* jsdom never fires transition events, so closing overlays only completes with motion disabled */}
      <ConfigProvider theme={{ token: { motion: false } }}>
        <Chapter
          chapter={alFatihah}
          chapters={chapterList}
          leftContent={leftContent}
          rightContent={rightContent}
          versesRecitations={versesRecitations}
          recitations={recitations}
          playerSettings={{ reciter: 1, hideTafsirs: true }}
          notice={notice}
        />
      </ConfigProvider>
    </TestProviders>,
  );
  return user;
};

const startRecitation = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Recite" }));
  const dialog = await screen.findByRole("dialog", { name: "Play Options" });
  await user.click(within(dialog).getByRole("button", { name: "Play" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Play Options" })).not.toBeInTheDocument());
};

describe("Chapter", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("renders the chapter title and every verse", () => {
    renderChapter();

    expect(screen.getByRole("heading", { level: 1, name: "Al-Fatihah - The Opener" })).toBeInTheDocument();
    for (const text of ["Translation one", "Tafsir two", "Arabic three"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: "Play verse" })).toHaveLength(3);
  });

  it("introduces the chapter with its names, details and the bismillah", () => {
    renderChapter();

    expect(screen.getByRole("heading", { level: 2, name: "Al-Fatihah" })).toBeInTheDocument();
    expect(screen.getByText("The Opener")).toBeInTheDocument();
    expect(screen.getByText("Meccan · 3 verses")).toBeInTheDocument();
    expect(screen.getByText("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ")).toBeInTheDocument();
  });

  it("shows a notice above the verses", () => {
    renderChapter(<p>Some content is missing</p>);

    expect(screen.getByText("Some content is missing")).toBeInTheDocument();
  });

  it("labels the toolbar buttons on wide screens", () => {
    const { matchMedia } = window;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({ ...matchMedia(query), matches: true }));
    try {
      renderChapter();

      expect(screen.getByRole("button", { name: "Chapters" })).toHaveTextContent("Chapters");
      expect(screen.getByRole("button", { name: "Recite" })).toHaveTextContent("Recite");
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it("lists the chapters in a drawer", async () => {
    const user = renderChapter();

    await user.click(screen.getByRole("button", { name: "Chapters" }));

    const nav = await screen.findByRole("navigation", { name: "Chapters" });
    expect(within(nav).getByRole("link", { name: "1. Al-Fatihah (The Opener)" })).toHaveAttribute(
      "href",
      "/chapters/1",
    );
    expect(within(nav).getByRole("link", { name: "2. Al-Baqarah (The Cow)" })).toHaveAttribute("href", "/chapters/2");

    await user.click(within(nav).getByRole("link", { name: "2. Al-Baqarah (The Cow)" }));
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Chapters" })).not.toBeInTheDocument());
  });

  describe("chapter search", () => {
    const searchChapters = async (query: string) => {
      const user = renderChapter(undefined, {
        chapters: [
          alFatihah,
          chapter(2, "Al-Baqarah", "The Cow", 286),
          chapter(12, "Yusuf", "Joseph", 111),
          chapter(21, "Al-Anbya", "The Prophets", 112),
          chapter(112, "Al-Ikhlas", "Sincerity", 4),
        ],
      });
      await user.click(screen.getByRole("button", { name: "Chapters" }));
      await user.type(await screen.findByRole("textbox", { name: "Search chapters" }), query);
      const nav = screen.getByRole("navigation", { name: "Chapters" });
      return {
        user,
        nav,
        links: () =>
          within(nav)
            .queryAllByRole("link")
            .map((link) => link.textContent),
      };
    };

    it.each([
      ["the number", "112", ["112. Al-Ikhlas (Sincerity)"]],
      ["the transliterated name", "baqara", ["2. Al-Baqarah (The Cow)"]],
      ["the English name", "prophets", ["21. Al-Anbya (The Prophets)"]],
      ["a misspelled name", "yusef", ["12. Yusuf (Joseph)"]],
    ])("finds a chapter by %s", async (_, query, expected) => {
      const { links } = await searchChapters(query);

      expect(links()).toEqual(expected);
    });

    it("ranks the exact number first", async () => {
      const { links } = await searchChapters("12");

      expect(links()[0]).toBe("12. Yusuf (Joseph)");
      expect(links()).toContain("112. Al-Ikhlas (Sincerity)");
    });

    it("says when nothing matches and lists every chapter again once cleared", async () => {
      const { user, nav, links } = await searchChapters("zzzz");

      expect(links()).toEqual([]);
      expect(within(nav).getByText("No chapters found")).toBeInTheDocument();

      await user.clear(screen.getByRole("textbox", { name: "Search chapters" }));
      expect(links()).toHaveLength(5);
    });

    it("clears the search when the drawer closes", async () => {
      const { user, nav } = await searchChapters("baqara");

      await user.click(within(nav).getByRole("link", { name: "2. Al-Baqarah (The Cow)" }));
      await waitFor(() => expect(screen.queryByRole("navigation", { name: "Chapters" })).not.toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Chapters" }));

      expect(await screen.findByRole("textbox", { name: "Search chapters" })).toHaveValue("");
    });
  });

  it("marks the verses faved in this chapter", async () => {
    await lf.setItem("faves-quran", ["1:2", "2:1"]);
    renderChapter();

    expect(await screen.findByRole("button", { name: "Remove from favorites" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add to favorites" })).toHaveLength(2);
  });

  it("updates faves when they change in storage", async () => {
    const user = renderChapter();

    await user.click(screen.getAllByRole("button", { name: "Add to favorites" })[0]);

    expect(await screen.findByRole("button", { name: "Remove from favorites" })).toBeInTheDocument();
  });

  it("scrolls to the saved reading progress", async () => {
    await lf.setItem("progress-surah-1", 2);
    renderChapter();

    await waitFor(() =>
      expect(scrollToIndex).toHaveBeenCalledWith({ index: 1, align: "start", behavior: "smooth", offset: -120 }),
    );
  });

  it("ignores invalid reading progress", async () => {
    await lf.setItem("progress-surah-1", 99);
    const getItem = vi.spyOn(lf, "getItem");
    renderChapter();

    await waitFor(() => expect(getItem).toHaveBeenCalledWith("progress-surah-1"));
    await Promise.all(getItem.mock.results.map((r) => r.value));
    expect(scrollToIndex).not.toHaveBeenCalled();
    getItem.mockRestore();
  });

  describe("shared verse links", () => {
    afterEach(() => {
      window.location.hash = "";
    });

    it("scrolls to the linked verse instead of the saved progress", async () => {
      await lf.setItem("progress-surah-1", 2);
      window.location.hash = "#v-3";
      renderChapter();

      await waitFor(() =>
        expect(scrollToIndex).toHaveBeenCalledWith({ index: 2, align: "start", behavior: "smooth", offset: -120 }),
      );
      expect(scrollToIndex).toHaveBeenCalledTimes(1);
    });

    it("falls back to the saved progress for a verse outside the chapter", async () => {
      await lf.setItem("progress-surah-1", 2);
      window.location.hash = "#v-9";
      renderChapter();

      await waitFor(() =>
        expect(scrollToIndex).toHaveBeenCalledWith({ index: 1, align: "start", behavior: "smooth", offset: -120 }),
      );
    });
  });

  it("plays a single verse from its play button", async () => {
    const user = renderChapter();

    await user.click(screen.getAllByRole("button", { name: "Play verse" })[0]);
    expect(screen.getByRole("button", { name: "Stop verse" })).toBeInTheDocument();

    expect(screen.getByRole("article", { name: "Verse 1" })).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Stop verse" }));
    expect(screen.getAllByRole("button", { name: "Play verse" })).toHaveLength(3);
    expect(screen.getByRole("article", { name: "Verse 1" })).not.toHaveAttribute("aria-current");
  });

  it("highlights the verse being recited", async () => {
    const user = renderChapter();

    await startRecitation(user);

    expect(screen.getByRole("article", { name: "Verse 1" })).toHaveAttribute("aria-current", "true");
    await user.click(screen.getByRole("button", { name: "Next verse" }));
    expect(screen.getByRole("article", { name: "Verse 2" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("article", { name: "Verse 1" })).not.toHaveAttribute("aria-current");
  });

  it("switches to recitation mode from the play options", async () => {
    const user = renderChapter();

    await startRecitation(user);

    expect(savePlayerSettings).toHaveBeenCalledWith({ reciter: 1, hideTafsirs: true });
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recite" })).not.toBeInTheDocument();
    // tafsirs are hidden while reciting
    expect(screen.queryByText("Tafsir one")).not.toBeInTheDocument();
    expect(screen.getByText("Translation one")).toBeInTheDocument();
  });

  it("reopens the play options from the audio bar", async () => {
    const user = renderChapter();
    await startRecitation(user);

    await user.click(screen.getByRole("button", { name: "Play Options" }));

    expect(await screen.findByRole("dialog", { name: "Play Options" })).toBeInTheDocument();
  });

  it("returns to reading mode after confirming", async () => {
    const user = renderChapter();
    await startRecitation(user);

    await user.click(screen.getByRole("button", { name: "Read" }));
    expect(await screen.findByText("Stop recitation?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(await screen.findByRole("button", { name: "Recite" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(screen.getByText("Tafsir one")).toBeInTheDocument();
  });

  it("keeps reciting when stopping is declined", async () => {
    const user = renderChapter();
    await startRecitation(user);

    await user.click(screen.getByRole("button", { name: "Read" }));
    await user.click(await screen.findByRole("button", { name: "No" }));

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recite" })).not.toBeInTheDocument();
  });
});
