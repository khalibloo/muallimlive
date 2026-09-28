import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import GlossedText from "./GlossedText";

const renderText = (html: string, words: VerseWord[]) =>
  render(
    <TestProviders>
      <GlossedText html={html} words={words} />
    </TestProviders>,
  );

describe("GlossedText", () => {
  it("shows a word group's gloss on hover", async () => {
    const user = userEvent.setup();
    renderText("Bismi <tajweed class=HmA>A</tajweed>llāhi", [
      { text: "Bismi", translation: "In the name of" },
      { text: "Allāhi", translation: "God" },
    ]);

    await user.hover(screen.getByText("Bismi"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent("In the name of");
  });

  it("shows a gloss when its word group is focused, as tapping does", async () => {
    const user = userEvent.setup();
    renderText("Bismi Allāhi", [{ text: "Bismi" }, { text: "Allāhi", translation: "God" }]);

    await user.tab();

    expect(await screen.findByRole("tooltip")).toHaveTextContent("God");
  });

  it("keeps the tajweed markings", () => {
    renderText("Bismi <tajweed class=HmA>A</tajweed>llāhi", [
      { text: "Bismi" },
      { text: "Allāhi", translation: "God" },
    ]);

    expect(screen.getByText("A")).toHaveAttribute("class", "HmA");
  });

  it("only makes the word groups with a gloss focusable", () => {
    renderText("Bismi Allāhi", [{ text: "Bismi" }, { text: "Allāhi", translation: "God" }]);

    expect(screen.getByText("Bismi")).not.toHaveAttribute("tabindex");
    expect(screen.getByText("Allāhi")).toHaveAttribute("tabindex", "0");
  });

  it("shows the plain markup when the word groups don't match the text", () => {
    renderText("Bismi <tajweed class=HmA>A</tajweed>llāhi", [{ text: "Rabbi", translation: "Lord" }]);

    expect(screen.getByText("A")).toHaveAttribute("class", "HmA");
    expect(screen.getByText(/Bismi/)).not.toHaveAttribute("tabindex");
  });
});
