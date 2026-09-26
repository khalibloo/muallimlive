import React from "react";
import { render, screen, within } from "@testing-library/react";

import { stubFetch } from "@/components/test/fakeCaches";
import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import { setFave } from "@/utils/userData";
import OfflinePage from "./OfflinePage";

// renders every item so all verses are reachable
vi.mock("react-virtuoso", async () => {
  const { forwardRef } = await import("react");
  return {
    Virtuoso: forwardRef(function Virtuoso({
      data,
      itemContent,
    }: {
      data: unknown[];
      itemContent: (index: number, item: unknown) => React.ReactNode;
    }) {
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

const alFatihah: Chapter = {
  id: 1,
  revelation_place: "makkah",
  revelation_order: 5,
  bismillah_pre: false,
  name_simple: "Al-Fatihah",
  name_complex: "Al-Fātiĥah",
  name_arabic: "",
  verses_count: 1,
  pages: [1],
  translated_name: { name: "The Opener", language_name: "english" },
};

const readerSettings: ReaderSettings = {
  splitView: true,
  left: [{ content: ["translation", "en", 20] }],
  right: [{ content: ["translation", "ar", "uthmani"] }],
};

const responses = {
  "/api/resources/chapters": { chapters: [alFatihah] },
  "/api/resources/recitations": { recitations: [] },
  "/api/content/translation/20/1": [{ id: 1, verse_key: "1:1", text: "In the name of Allah" }],
  "/api/content/arabic/uthmani/1": [{ id: 1, verse_key: "1:1", text: "بِسْمِ ٱللَّهِ", isArabic: true }],
};

const renderAt = (pathname: string) => {
  window.history.pushState({}, "", pathname);
  render(
    <TestProviders>
      <OfflinePage />
    </TestProviders>,
  );
};

describe("OfflinePage", () => {
  beforeEach(async () => {
    await lf.clear();
    document.cookie = `reader-settings=${encodeURIComponent(JSON.stringify(readerSettings))}`;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("renders a chapter from the downloaded content", async () => {
    stubFetch(responses);
    renderAt("/chapters/1");

    expect(await screen.findByRole("heading", { level: 1, name: "Al-Fatihah - The Opener" })).toBeInTheDocument();
    expect(screen.getByText("In the name of Allah")).toBeInTheDocument();
    expect(screen.getByText("بِسْمِ ٱللَّهِ")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("warns when some of the display settings content isn't downloaded", async () => {
    const { "/api/content/arabic/uthmani/1": _, ...rest } = responses;
    stubFetch(rest);
    renderAt("/chapters/1");

    expect(
      await screen.findByText(/Some of the content in your display settings hasn't been downloaded/),
    ).toBeInTheDocument();
    expect(screen.getByText("In the name of Allah")).toBeInTheDocument();
  });

  it("is unavailable for chapters it can't load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderAt("/chapters/1");

    expect(await screen.findByRole("heading", { level: 1, name: "You're offline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Back To Home" })).toHaveAttribute("href", "/");
  });

  it("is unavailable for chapters missing from the chapter list", async () => {
    stubFetch(responses);
    renderAt("/chapters/2");

    expect(await screen.findByRole("heading", { level: 1, name: "You're offline" })).toBeInTheDocument();
  });

  it("renders the home page from the downloaded chapter list", async () => {
    stubFetch(responses);
    renderAt("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Al-Qur'an" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1. Al-Fatihah (The Opener)" })).toHaveAttribute("href", "/chapters/1");
  });

  it("is unavailable at home without the chapter list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderAt("/");

    expect(await screen.findByRole("heading", { level: 1, name: "You're offline" })).toBeInTheDocument();
  });

  it("renders the favorites from the downloaded content", async () => {
    stubFetch(responses);
    await setFave(1, 1, true);
    renderAt("/saved");

    expect(await screen.findByRole("heading", { level: 1, name: "Favorites & Notes" })).toBeInTheDocument();
    const verse = await screen.findByRole("article", { name: "Verse 1:1" });
    expect(await within(verse).findByText("In the name of Allah")).toBeInTheDocument();
    expect(within(verse).getByText("بِسْمِ ٱللَّهِ")).toBeInTheDocument();
  });

  it("is unavailable for favorites without the chapter list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderAt("/saved");

    expect(await screen.findByRole("heading", { level: 1, name: "You're offline" })).toBeInTheDocument();
  });

  it("is unavailable for other pages", () => {
    renderAt("/terms");

    expect(screen.getByRole("heading", { level: 1, name: "You're offline" })).toBeInTheDocument();
  });
});
