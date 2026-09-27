import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChapterSearchProvider } from "@/components/ChapterSearchContext";
import { fixture, fixtureCollection } from "@/components/test/hadithFixtures";
import TestProviders from "@/components/test/TestProviders";
import Book from "./Book";

const bukhari = fixtureCollection("bukhari");
const index13 = fixture<GetHadithBookIndexResponse>("bukhari/13/index").hadiths;

const renderWithProviders = (children: React.ReactNode) =>
  render(
    <TestProviders>
      <ChapterSearchProvider>{children}</ChapterSearchProvider>
    </TestProviders>,
  );

// the breadcrumb above the list is also an accessible list, so scope to the results list
const resultItems = () => within(screen.getAllByRole("list").at(-1)!).getAllByRole("listitem");

describe("Book", () => {
  it("lists and filters a book's hadiths", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Book collection={bukhari} book={bukhari.books[2]} hadiths={index13} />);
    expect(resultItems()).toHaveLength(63);
    await user.type(screen.getByRole("searchbox", { name: "Filter by number or narrator" }), "Abu Hurai");
    resultItems().forEach((item) => expect(item).toHaveTextContent("Abu Huraira"));
    await user.clear(screen.getByRole("searchbox", { name: "Filter by number or narrator" }));
    await user.type(screen.getByRole("searchbox", { name: "Filter by number or narrator" }), "zzzz");
    expect(screen.getByText("No hadiths found")).toBeVisible();
  });

  it("marks cut excerpts with an ellipsis", () => {
    renderWithProviders(<Book collection={bukhari} book={bukhari.books[2]} hadiths={index13} />);
    const cut = index13.find((h) => h.truncated)!;
    expect(screen.getByRole("link", { name: new RegExp(`^${cut.id}\\b`) })).toHaveTextContent("…");
  });
});
