import { render, screen } from "@testing-library/react";

import { ChapterSearchProvider } from "@/components/ChapterSearchContext";
import { hadithResources } from "@/components/test/hadithFixtures";
import TestProviders from "@/components/test/TestProviders";
import Hadiths from "./Hadiths";

const { collections } = hadithResources;

const renderWithProviders = (children: React.ReactNode) =>
  render(
    <TestProviders>
      <ChapterSearchProvider>{children}</ChapterSearchProvider>
    </TestProviders>,
  );

describe("Hadiths", () => {
  it("lists the collections with their counts", () => {
    renderWithProviders(<Hadiths collections={collections} />);
    expect(screen.getByRole("link", { name: /Sahih al-Bukhari/ })).toHaveAttribute("href", "/hadiths/bukhari");
    expect(screen.getByRole("link", { name: /Sahih al-Bukhari/ })).toHaveTextContent("3 books · 118 hadiths");
  });
});
