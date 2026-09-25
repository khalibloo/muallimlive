import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockAllIsIntersecting } from "react-intersection-observer/test-utils";

import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import Verse from "./Verse";

const left: VerseText[] = [
  { id: 1, verse_key: "1:2", text: "All praise is due to Allah", isBold: true },
  { id: 2, verse_key: "1:2", text: "<p>Tafsir <em>text</em></p>", isHTML: true, isTafsir: true },
  { id: 3, verse_key: "1:2", text: "" },
];
const right: VerseText[] = [
  { id: 1, verse_key: "1:2", text: "<span>ٱلْحَمْدُ لِلَّهِ</span>", isHTML: true, isArabic: true },
  { id: 2, verse_key: "1:2", text: "Right translation" },
  { id: 3, verse_key: "1:2", text: "Right tafsir", isTafsir: true },
];

const defaultProps = {
  verseNumber: 2,
  chapterNumber: 1,
  totalVerses: 7,
  faved: false,
  left,
  right,
  onPlay: vi.fn(),
  onEnded: vi.fn(),
  isPlaying: false,
  volume: 1,
  muted: false,
};

const renderVerse = (props: Partial<React.ComponentProps<typeof Verse>> = {}) =>
  render(
    <TestProviders>
      <Verse {...defaultProps} {...props} />
    </TestProviders>,
  );

const setScrollY = (value: number) => Object.defineProperty(window, "scrollY", { configurable: true, value });

describe("Verse", () => {
  beforeEach(async () => {
    await lf.clear();
    setScrollY(0);
  });

  it("renders the verse number with left and right content", () => {
    renderVerse();

    expect(screen.getByText("2", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("All praise is due to Allah")).toBeInTheDocument();
    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("ٱلْحَمْدُ لِلَّهِ")).toBeInTheDocument();
    expect(screen.getByText("Right translation")).toBeInTheDocument();
    expect(screen.getByText("Right tafsir")).toBeInTheDocument();
    // empty left items (e.g. verses skipped by a tafsir) are not rendered
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("hides tafsirs when requested", () => {
    renderVerse({ hideTafsirs: true });

    expect(screen.getByText("All praise is due to Allah")).toBeInTheDocument();
    expect(screen.getByText("Right translation")).toBeInTheDocument();
    expect(screen.queryByText("text")).not.toBeInTheDocument();
    expect(screen.queryByText("Right tafsir")).not.toBeInTheDocument();
  });

  it("renders a single pane when only one side has content", () => {
    renderVerse({ right: [] });

    expect(screen.getByText("All praise is due to Allah")).toBeInTheDocument();
    expect(screen.queryByText("Right translation")).not.toBeInTheDocument();
  });

  it("shows the favorite and notes actions", () => {
    renderVerse({ faved: true });

    expect(screen.getByRole("button", { name: "Remove from favorites" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notes" })).toBeInTheDocument();
  });

  it("calls onPlay when play is clicked", async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const onEnded = vi.fn();
    renderVerse({ onPlay, onEnded, audioUrl: "https://audio.test/1_2.mp3" });

    await user.click(screen.getByRole("button", { name: "Play verse" }));

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("plays the audio and calls onEnded when stop is clicked", async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const onEnded = vi.fn();
    renderVerse({ onPlay, onEnded, isPlaying: true, audioUrl: "https://audio.test/1_2.mp3" });

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Stop verse" }));

    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("pauses the audio when playback stops", () => {
    const { rerender } = renderVerse({ isPlaying: true, audioUrl: "https://audio.test/1_2.mp3" });

    rerender(
      <TestProviders>
        <Verse {...defaultProps} isPlaying={false} audioUrl="https://audio.test/1_2.mp3" />
      </TestProviders>,
    );

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("ends playback when the audio fails to play", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("NotAllowedError"));
    const onEnded = vi.fn();
    renderVerse({ onEnded, isPlaying: true, audioUrl: "https://audio.test/1_2.mp3" });

    await waitFor(() => expect(onEnded).toHaveBeenCalled());
  });

  it("saves reading progress when the verse scrolls into view", async () => {
    setScrollY(500);
    renderVerse();

    mockAllIsIntersecting(true);

    await waitFor(async () => expect(await lf.getItem("progress-surah-1")).toBe(2));
  });

  it("remembers the verse in view as the last read, even near the top", async () => {
    renderVerse();

    mockAllIsIntersecting(true);

    await waitFor(async () => expect(await lf.getItem("last-read")).toEqual({ chapter: 1, verse: 2 }));
  });

  it("marks the verse being recited as current", () => {
    const { rerender } = renderVerse();
    expect(screen.getByRole("article", { name: "Verse 2" })).not.toHaveAttribute("aria-current");

    rerender(
      <TestProviders>
        <Verse {...defaultProps} highlighted />
      </TestProviders>,
    );

    expect(screen.getByRole("article", { name: "Verse 2" })).toHaveAttribute("aria-current", "true");
  });

  it("clears reading progress near the top of the page", async () => {
    await lf.setItem("progress-surah-1", 5);
    renderVerse();

    mockAllIsIntersecting(true);

    await waitFor(async () => expect(await lf.getItem("progress-surah-1")).toBeNull());
  });

  it("clears reading progress on the last verse", async () => {
    await lf.setItem("progress-surah-1", 5);
    setScrollY(500);
    renderVerse({ verseNumber: 7 });

    mockAllIsIntersecting(true);

    await waitFor(async () => expect(await lf.getItem("progress-surah-1")).toBeNull());
  });
});
