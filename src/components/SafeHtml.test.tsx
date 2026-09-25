import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import SafeHtml from "./SafeHtml";

describe("SafeHtml", () => {
  it("renders the given HTML", () => {
    render(
      <TestProviders>
        <SafeHtml html="<p>In the name of <strong>Allah</strong></p>" />
      </TestProviders>,
    );

    expect(screen.getByText("Allah")).toBeInTheDocument();
    expect(screen.getByText(/In the name of/)).toBeInTheDocument();
  });

  it("strips scripts and inline event handlers", async () => {
    const user = userEvent.setup();
    const onXss = vi.fn();
    (window as any).onXss = onXss;
    render(
      <TestProviders>
        <SafeHtml html={'<button onclick="window.onXss()">Click</button><script>window.onXss()</script>'} />
      </TestProviders>,
    );

    const button = screen.getByRole("button", { name: "Click" });
    expect(button).not.toHaveAttribute("onclick");
    await user.click(button);
    expect(onXss).not.toHaveBeenCalled();
    expect(screen.queryByText("window.onXss()")).not.toBeInTheDocument();
    delete (window as any).onXss;
  });

  it("keeps the custom tajweed tag and its class", () => {
    render(
      <TestProviders>
        <SafeHtml html={'بِسْمِ <tajweed class="ham_wasl">ٱ</tajweed>للَّهِ'} />
      </TestProviders>,
    );

    const tajweed = screen.getByText("ٱ");
    expect(tajweed.tagName).toBe("TAJWEED");
    expect(tajweed).toHaveAttribute("class", "ham_wasl");
  });
});
