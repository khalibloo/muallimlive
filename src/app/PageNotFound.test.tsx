import { render, screen } from "@testing-library/react";

import TestProviders from "@/components/test/TestProviders";
import PageNotFound from "./PageNotFound";

describe("PageNotFound", () => {
  it("explains the page was not found and links back home", () => {
    render(
      <TestProviders>
        <PageNotFound />
      </TestProviders>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Uh-oh, Page not found!" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sorry, we could not find the page you're looking for. It may have been moved or you visited an invalid link.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Back To Home" })).toHaveAttribute("href", "/");
  });
});
