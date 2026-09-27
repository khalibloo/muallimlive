import { render, screen, within } from "@testing-library/react";

import { ChapterSearchProvider } from "@/components/ChapterSearchContext";
import { fixtureCollection } from "@/components/test/hadithFixtures";
import TestProviders from "@/components/test/TestProviders";
import Collection from "./Collection";

const bukhari = fixtureCollection("bukhari");
const malik = fixtureCollection("malik");

const renderWithProviders = (children: React.ReactNode) =>
  render(
    <TestProviders>
      <ChapterSearchProvider>{children}</ChapterSearchProvider>
    </TestProviders>,
  );

describe("Collection", () => {
  it("lists Bukhari's books under their volumes", () => {
    renderWithProviders(<Collection collection={bukhari} />);
    const volume2 = screen.getByRole("region", { name: "Volume 2" });
    expect(within(volume2).getByRole("link", { name: /13\. Friday Prayer/ })).toHaveAttribute(
      "href",
      "/hadiths/bukhari/13",
    );
    expect(within(screen.getByRole("region", { name: "Volume 1" })).getAllByRole("link")).toHaveLength(2);
  });

  it("lists books without headings when there are no volumes", () => {
    renderWithProviders(<Collection collection={malik} />);
    expect(screen.queryByRole("region", { name: /Volume/ })).toBeNull();
    expect(screen.getByRole("link", { name: /4\. Forgetfulness in Prayer/ })).toBeVisible();
  });
});
