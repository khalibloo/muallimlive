import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import Share from "./Share";

const renderShare = (props: { path: string; title: string; label: string }) =>
  render(
    <TestProviders>
      <Share {...props} />
    </TestProviders>,
  );

const setShare = (share?: Navigator["share"]) =>
  Object.defineProperty(navigator, "share", { configurable: true, value: share });

const verseProps = { path: "/chapters/1#v-3", title: "Al-Fatihah, verse 3", label: "Share verse" };
const hadithProps = {
  path: "/hadiths/bukhari/13/1",
  title: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1",
  label: "Share hadith",
};

describe("Share", () => {
  afterEach(() => {
    setShare(undefined);
  });

  it("shares the verse link with the Web Share API", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    renderShare(verseProps);

    await user.click(screen.getByRole("button", { name: "Share verse" }));

    expect(share).toHaveBeenCalledWith({
      title: "Al-Fatihah, verse 3",
      url: `${window.location.origin}/chapters/1#v-3`,
    });
  });

  it("shares a hadith link with the Web Share API", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    renderShare(hadithProps);

    await user.click(screen.getByRole("button", { name: "Share hadith" }));

    expect(share).toHaveBeenCalledWith({
      title: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1",
      url: `${window.location.origin}/hadiths/bukhari/13/1`,
    });
  });

  it("stays quiet when the reader closes the share sheet", async () => {
    const user = userEvent.setup();
    setShare(vi.fn().mockRejectedValue(new DOMException("Share canceled", "AbortError")));
    renderShare(verseProps);

    await user.click(screen.getByRole("button", { name: "Share verse" }));

    await waitFor(() => expect(screen.queryByText("Couldn't share the link")).not.toBeInTheDocument());
  });

  it("reports a failed share", async () => {
    const user = userEvent.setup();
    setShare(vi.fn().mockRejectedValue(new DOMException("Not allowed", "NotAllowedError")));
    renderShare(verseProps);

    await user.click(screen.getByRole("button", { name: "Share verse" }));

    expect(await screen.findByText("Couldn't share the link")).toBeInTheDocument();
  });

  it("copies the verse link when the Web Share API is missing", async () => {
    const user = userEvent.setup();
    renderShare(verseProps);

    await user.click(screen.getByRole("button", { name: "Share verse" }));

    expect(await screen.findByText("Link copied")).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/chapters/1#v-3`);
  });
});
