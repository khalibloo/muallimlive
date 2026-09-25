import { render, screen } from "@testing-library/react";

import TestProviders from "@/components/test/TestProviders";
import messages from "@/locales/en/common.json";
import TermsOfService from "./TermsOfService";

describe("TermsOfService", () => {
  it("renders the heading and every term", () => {
    render(
      <TestProviders>
        <TermsOfService />
      </TestProviders>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
    const { common } = messages;
    for (const text of [
      common["terms-intro"],
      common["terms-reasonable"],
      common["terms-accuracy"],
      common["terms-agreement"],
      common["terms-liability"],
      common["terms-no-lawsuits"],
      common["terms-honest-use"],
      common["terms-no-hatred"],
      common["terms-no-out-of-context"],
      common["terms-under-13"],
      common["terms-supplement"],
      common["terms-updates"],
      common["terms-have-fun"],
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("links to quran.com in a new tab", () => {
    render(
      <TestProviders>
        <TermsOfService />
      </TestProviders>,
    );

    const link = screen.getByRole("link", { name: "https://www.quran.com" });
    expect(link).toHaveAttribute("href", "https://www.quran.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
