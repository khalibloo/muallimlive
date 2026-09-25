import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { VirtuosoHandle } from "react-virtuoso";

import TestProviders from "@/components/test/TestProviders";
import AudioBar from "./AudioBar";

const audioUrls = ["https://audio.test/1_5.mp3", "https://audio.test/1_6.mp3", "https://audio.test/1_7.mp3"];

const scrollToIndex = vi.fn();
const onOpenSettings = vi.fn();
const onVerseChange = vi.fn();

const Harness: React.FC<{ initialPlaying?: boolean }> = ({ initialPlaying = false }) => {
  const [isPlaying, setIsPlaying] = useState(initialPlaying);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const virtualListRef = React.useRef({ scrollToIndex } as unknown as VirtuosoHandle);
  return (
    <AudioBar
      audioUrls={audioUrls}
      start={5}
      isPlaying={isPlaying}
      setIsPlaying={setIsPlaying}
      volume={volume}
      setVolume={setVolume}
      muted={muted}
      setMuted={setMuted}
      onOpenSettings={onOpenSettings}
      virtualListRef={virtualListRef}
      onVerseChange={onVerseChange}
    />
  );
};

const renderAudioBar = (initialPlaying?: boolean) => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      <Harness initialPlaying={initialPlaying} />
    </TestProviders>,
  );
  return user;
};

const scrolledTo = () => scrollToIndex.mock.calls.map(([arg]) => arg.index);

describe("AudioBar", () => {
  it("scrolls to the first verse of the range on mount", () => {
    renderAudioBar();

    expect(scrollToIndex).toHaveBeenCalledWith({ index: 4, align: "start", behavior: "smooth" });
  });

  it("toggles between play and pause", async () => {
    const user = renderAudioBar();

    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("stops when the audio cannot be played", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("NotAllowedError"));
    const user = renderAudioBar();

    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(await screen.findByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("moves to the next and previous verses and starts playing", async () => {
    const user = renderAudioBar();

    await user.click(screen.getByRole("button", { name: "Next verse" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(scrolledTo()).toEqual([4, 5]);

    await user.click(screen.getByRole("button", { name: "Previous verse" }));
    expect(scrolledTo()).toEqual([4, 5, 4]);
  });

  it("reports the verse being recited and shows the progress through the range", async () => {
    const user = renderAudioBar();

    expect(onVerseChange).toHaveBeenLastCalledWith(5);
    expect(screen.getByRole("progressbar", { name: "Verse 5 of 7" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next verse" }));

    expect(onVerseChange).toHaveBeenLastCalledWith(6);
    expect(screen.getByRole("progressbar", { name: "Verse 6 of 7" })).toBeInTheDocument();
  });

  it("restarts the first verse when going back from it", async () => {
    const user = renderAudioBar();

    await user.click(screen.getByRole("button", { name: "Previous verse" }));

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(scrolledTo()).toEqual([4]);
  });

  it("disables next on the last verse unless looping, and loops back to the start", async () => {
    const user = renderAudioBar();
    const next = () => screen.getByRole("button", { name: "Next verse" });
    const loop = () => screen.getByRole("button", { name: "Loop" });

    await user.click(next());
    await user.click(next());
    expect(next()).toBeDisabled();

    expect(loop()).toHaveAttribute("aria-pressed", "false");
    await user.click(loop());
    expect(loop()).toHaveAttribute("aria-pressed", "true");
    expect(next()).toBeEnabled();

    await user.click(next());
    expect(scrolledTo()).toEqual([4, 5, 6, 4]);
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("stops scrolling along when auto scroll is off", async () => {
    const user = renderAudioBar();
    const autoScroll = () => screen.getByRole("button", { name: "Auto scroll" });
    expect(autoScroll()).toHaveAttribute("aria-pressed", "true");

    await user.click(autoScroll());
    expect(autoScroll()).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Next verse" }));

    expect(scrolledTo()).toEqual([4]);
  });

  it("toggles mute and unmutes when the volume changes", async () => {
    const user = renderAudioBar();

    await user.click(screen.getByRole("button", { name: "Volume" }));
    await user.click(await screen.findByRole("button", { name: "Mute" }));
    expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();

    const slider = () => screen.getByRole("slider", { name: "Volume level" });
    expect(slider()).toHaveAttribute("aria-valuenow", "0.5");
    // the slider only reads the legacy `keyCode`, which user-event never sets, so fireEvent is required here
    fireEvent.keyDown(slider(), { key: "ArrowUp", keyCode: 38 });

    await waitFor(() => expect(slider()).toHaveAttribute("aria-valuenow", "0.51"));
    expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
  });

  it("opens the play options", async () => {
    const user = renderAudioBar();

    await user.click(screen.getByRole("button", { name: "Play Options" }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
