import { render, screen } from "@testing-library/react";

import { hadithResources } from "@/components/test/hadithFixtures";
import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import Dashboard from "./Dashboard";

const chapter = (id: number, name: string): Chapter => ({
  id,
  revelation_place: "makkah",
  revelation_order: id,
  bismillah_pre: true,
  name_simple: name,
  name_complex: name,
  name_arabic: "",
  verses_count: 7,
  pages: [1],
  translated_name: { name, language_name: "english" },
});

const chapters = [chapter(1, "Al-Fatihah"), chapter(2, "Al-Baqarah")];
const { collections } = hadithResources;
const hadithCount = collections.reduce((sum, c) => sum + c.hadithsCount, 0);

const renderDashboard = () =>
  render(
    <TestProviders>
      <Dashboard chapters={chapters} collections={collections} />
    </TestProviders>,
  );

describe("Dashboard", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("links to each module with its summary", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { level: 1, name: "MuallimLive" })).toBeInTheDocument();
    const quran = screen.getByRole("link", { name: /^Qur'an/ });
    expect(quran).toHaveAttribute("href", "/quran");
    expect(quran).toHaveTextContent("2 chapters");
    const hadith = screen.getByRole("link", { name: /^Hadith/ });
    expect(hadith).toHaveAttribute("href", "/hadiths");
    expect(hadith).toHaveTextContent(`${collections.length} collections · ${hadithCount} hadiths`);
  });

  it("links to the favorites and notes", () => {
    renderDashboard();

    expect(screen.getByRole("link", { name: /^Favorites & Notes/ })).toHaveAttribute("href", "/saved");
  });

  it("continues from the last verse read", async () => {
    await lf.setItem<LastRead>("last-read", { chapter: 2, verse: 5 });
    renderDashboard();

    const link = await screen.findByRole("link", { name: /Continue reading/ });
    expect(link).toHaveAttribute("href", "/quran/2");
    expect(link).toHaveTextContent("Al-Baqarah, verse 5");
  });

  it("doesn't offer to continue a chapter it doesn't know", async () => {
    await lf.setItem<LastRead>("last-read", { chapter: 99, verse: 1 });
    renderDashboard();

    await screen.findByRole("link", { name: /^Qur'an/ });
    expect(screen.queryByText("Continue reading")).not.toBeInTheDocument();
  });
});
