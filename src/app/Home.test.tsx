import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import Home from "./Home";

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

const renderHome = () => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      <Home chapters={chapters} />
    </TestProviders>,
  );
  return user;
};

describe("Home", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("links to every chapter", () => {
    renderHome();

    expect(screen.getByRole("heading", { level: 1, name: "Al-Qur'an" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1. Al-Fatihah (The Opener)" })).toHaveAttribute("href", "/chapters/1");
    expect(screen.getByRole("link", { name: "2. Al-Baqarah (The Cow)" })).toHaveAttribute("href", "/chapters/2");
    expect(screen.queryByText("Continue reading")).not.toBeInTheDocument();
  });

  it("links to the favorites and notes", () => {
    renderHome();

    expect(screen.getByRole("link", { name: "Favorites & Notes" })).toHaveAttribute("href", "/saved");
  });

  it("switches between the Qur'an and the hadiths", () => {
    render(<Home chapters={chapters} />, { wrapper: TestProviders });

    expect(screen.getByRole("link", { name: "Hadith" })).toHaveAttribute("href", "/hadiths");
    expect(screen.getByRole("link", { name: "Qur'an" })).toHaveAttribute("aria-current", "page");
  });

  it("searches the chapters", async () => {
    const user = renderHome();

    await user.type(screen.getByRole("textbox", { name: "Search chapters" }), "cow");

    expect(screen.getByRole("link", { name: "2. Al-Baqarah (The Cow)" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "1. Al-Fatihah (The Opener)" })).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Search chapters" }));
    await user.type(screen.getByRole("textbox", { name: "Search chapters" }), "zzzz");

    expect(screen.getByText("No chapters found")).toBeInTheDocument();
  });

  it("continues from the last verse read", async () => {
    await lf.setItem<LastRead>("last-read", { chapter: 2, verse: 5 });
    renderHome();

    const link = await screen.findByRole("link", { name: /Continue reading/ });
    expect(link).toHaveAttribute("href", "/chapters/2");
    expect(link).toHaveTextContent("Al-Baqarah, verse 5");
  });
});
