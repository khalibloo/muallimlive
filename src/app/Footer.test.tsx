import { render, screen } from "@testing-library/react";

import TestProviders from "@/components/test/TestProviders";
import Footer from "./Footer";

describe("Footer", () => {
  it("links to the terms of service and privacy policy", () => {
    render(
      <TestProviders>
        <Footer />
      </TestProviders>,
    );

    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });

  it("shows the copyright notice for the current year", () => {
    render(
      <TestProviders>
        <Footer />
      </TestProviders>,
    );

    expect(screen.getByText(`Khalibloo ©${new Date().getFullYear()} All Rights Reserved`)).toBeInTheDocument();
  });
});
