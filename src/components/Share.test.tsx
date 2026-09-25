import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import Share from "./Share";

const renderShare = () =>
  render(
    <TestProviders>
      <Share chapterNumber={1} chapterName="Al-Fatihah" verseNumber={3} />
    </TestProviders>,
  );

const setShare = (share?: Navigator["share"]) =>
  Object.defineProperty(navigator, "share", { configurable: true, value: share });

describe("Share", () => {
  afterEach(() => {
    setShare(undefined);
  });

  it("shares the verse link with the Web Share API", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    renderShare();

    await user.click(screen.getByRole("button", { name: "Share verse" }));

    expect(share).toHaveBeenCalledWith({
      title: "Al-Fatihah, verse 3",
      url: `${window.location.origin}/chapters/1#v-3`,
    });
  });

  it("stays quiet when the reader closes the share sheet", async () => {
    const user = userEvent.setup();
    setShare(vi.fn().mockRejectedValue(new DOMException("Share canceled", "AbortError")));
    renderShare();

    await user.click(screen.getByRole("button", { name: "Share verse" }));

    await waitFor(() => expect(screen.queryByText("Couldn't share the verse")).not.toBeInTheDocument());
  });

  it("reports a failed share", async () => {
    const user = userEvent.setup();
    setShare(vi.fn().mockRejectedValue(new DOMException("Not allowed", "NotAllowedError")));
    renderShare();

    await user.click(screen.getByRole("button", { name: "Share verse" }));

    expect(await screen.findByText("Couldn't share the verse")).toBeInTheDocument();
  });

  it("copies the verse link when the Web Share API is missing", async () => {
    const user = userEvent.setup();
    renderShare();

    await user.click(screen.getByRole("button", { name: "Share verse" }));

    expect(await screen.findByText("Link copied")).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/chapters/1#v-3`);
  });
});
