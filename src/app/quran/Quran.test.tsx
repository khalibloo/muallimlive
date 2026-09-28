import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChapterSearchProvider, useSearchModal } from "@/components/ChapterSearchContext";
import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import Quran from "./Quran";

const chapter = (id: number, name: string, translation: string): Chapter => ({
  id,
  revelation_place: "makkah",
  revelation_order: id,
  bismillah_pre: true,
  name_simple: name,
  name_complex: name,
  name_arabic: "",
  verses_count: 7,
  pages: [1],
  translated_name: { name: translation, language_name: "english" },
});

const chapters = [chapter(1, "Al-Fatihah", "The Opener"), chapter(2, "Al-Baqarah", "The Cow")];

const SearchModeProbe: React.FC = () => <output>{useSearchModal().searchMode ?? "closed"}</output>;

const renderQuran = () => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      <ChapterSearchProvider>
        <Quran chapters={chapters} />
        <SearchModeProbe />
      </ChapterSearchProvider>
    </TestProviders>,
  );
  return user;
};

describe("Quran", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("links to every chapter", () => {
    renderQuran();

    expect(screen.getByRole("heading", { level: 1, name: "Al-Qur'an" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1. Al-Fatihah (The Opener)" })).toHaveAttribute("href", "/quran/1");
    expect(screen.getByRole("link", { name: "2. Al-Baqarah (The Cow)" })).toHaveAttribute("href", "/quran/2");
    expect(screen.queryByText("Continue reading")).not.toBeInTheDocument();
  });

  it("leaves switching modules to the dashboard and the menu", () => {
    renderQuran();

    expect(screen.queryByRole("link", { name: "Hadith" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Favorites & Notes" })).not.toBeInTheDocument();
  });

  it("opens the Qur'an search", async () => {
    const user = renderQuran();

    await user.click(screen.getByRole("button", { name: "Search the Qur'an" }));

    expect(screen.getByRole("status")).toHaveTextContent("quran");
  });

  it("finds a chapter by name or number", async () => {
    const user = renderQuran();
    const finder = screen.getByRole("textbox", { name: "Find a chapter" });
    expect(finder).toHaveAttribute("placeholder", "Name or number");

    await user.type(finder, "cow");

    expect(screen.getByRole("link", { name: "2. Al-Baqarah (The Cow)" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "1. Al-Fatihah (The Opener)" })).not.toBeInTheDocument();

    await user.clear(finder);
    await user.type(finder, "zzzz");

    expect(screen.getByText("No chapters found")).toBeInTheDocument();
  });

  it("continues from the last verse read", async () => {
    await lf.setItem<LastRead>("last-read", { chapter: 2, verse: 5 });
    renderQuran();

    const link = await screen.findByRole("link", { name: /Continue reading/ });
    expect(link).toHaveAttribute("href", "/quran/2");
    expect(link).toHaveTextContent("Al-Baqarah, verse 5");
  });
});
