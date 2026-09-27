import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChapterSearchProvider } from "@/components/ChapterSearchContext";
import { fixture } from "@/components/test/hadithFixtures";
import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import { setFave } from "@/utils/userData";
import HadithView from "./HadithView";

vi.mock("@/utils/userData", async (importOriginal) => ({ ...(await importOriginal()), setFave: vi.fn() }));

const hadith = fixture<Hadith>("bukhari/13/1");

const renderWithProviders = (children: React.ReactNode) =>
  render(
    <TestProviders>
      <ChapterSearchProvider>{children}</ChapterSearchProvider>
    </TestProviders>,
  );

describe("HadithView", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("shows the reference, the narrator and the text", () => {
    renderWithProviders(<HadithView hadith={hadith} previous={{ book: 2, id: "55" }} next={{ book: 13, id: "2" }} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1" }),
    ).toBeVisible();
    expect(screen.getByText("Narrated by Abu Huraira")).toBeVisible();
    expect(screen.getByText(hadith.text[0])).toBeVisible();
    const nav = within(screen.getByRole("navigation", { name: "Previous and next hadiths" }));
    expect(nav.getByRole("link", { name: "Previous hadith" })).toHaveAttribute("href", "/hadiths/bukhari/2/55");
    expect(nav.getByRole("link", { name: "Next hadith" })).toHaveAttribute("href", "/hadiths/bukhari/13/2");
    expect(screen.getByRole("link", { name: "13. Friday Prayer" })).toHaveAttribute("href", "/hadiths/bukhari/13");
  });

  it("shows a narrator chain, and the blessing spelled out", () => {
    const malik = fixture<Hadith>("malik/4/4.1.1");
    renderWithProviders(<HadithView hadith={malik} />);
    const chain = within(screen.getByRole("list", { name: "Narrator chain" }));
    expect(chain.getAllByRole("listitem").map((item) => item.textContent)).toEqual(
      malik.narrators!.map((name, i) => (i > 0 ? `←${name}` : name)),
    );
  });

  it("shows no narrator line when there are none", () => {
    renderWithProviders(<HadithView hadith={fixture<Hadith>("muslim/43/7188")} />);
    expect(screen.queryByText(/^Narrated by/)).toBeNull();
    expect(screen.queryByRole("list", { name: "Narrator chain" })).toBeNull();
  });

  it("spells out (peace_be_upon_him)", () => {
    renderWithProviders(<HadithView hadith={fixture<Hadith>("abu-dawud/7/1406")} />);
    expect(screen.getByText(/\(peace be upon him\)/)).toBeVisible();
  });

  it("favorites the hadith under its own key", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HadithView hadith={hadith} />);
    await user.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(setFave).toHaveBeenCalledWith("hadith:bukhari/13/1", true);
  });
});
