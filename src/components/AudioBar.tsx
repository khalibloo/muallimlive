import React, { useEffect, useRef, useState } from "react";
import { Row, Col, Button, Popover, Progress, Slider, Space } from "antd";
import { BsVolumeMute, BsVolumeUp } from "react-icons/bs";
import {
  ColumnHeightOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { VirtuosoHandle } from "react-virtuoso";
import { useTranslations } from "next-intl";

interface Props {
  audioUrls: string[];
  start: number;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  muted: boolean;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenSettings: () => void;
  virtualListRef: React.RefObject<VirtuosoHandle | null>;
  /** Called with the verse number whenever the recitation moves to another verse */
  onVerseChange?: (verse: number) => void;
}

/** Scroll offset that keeps a verse clear of the fixed nav bar and chapter toolbar */
export const VERSE_SCROLL_OFFSET = -120;

const AudioBar: React.FC<Props> = ({
  audioUrls,
  start,
  isPlaying,
  setIsPlaying,
  muted,
  setMuted,
  volume,
  setVolume,
  onOpenSettings,
  virtualListRef,
  onVerseChange,
}) => {
  const t = useTranslations("common");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loop, setLoop] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentUrl = audioUrls[currentIndex];

  // A new src aborts a pending play() (e.g. the reciter's URLs arrive after Play is pressed); that
  // play is superseded, not failed, so only other errors (autoplay blocked, bad file) stop playback
  const play = (audio: HTMLAudioElement) =>
    audio.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setIsPlaying(false);
      }
    });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (isPlaying) {
      play(audio);
    } else {
      audio.pause();
    }
  }, [isPlaying, currentIndex, currentUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted, currentIndex]);

  useEffect(() => {
    onVerseChange?.(start + currentIndex);
    if (autoScroll) {
      virtualListRef.current?.scrollToIndex({
        index: start - 1 + currentIndex,
        align: "start",
        behavior: "smooth",
        offset: VERSE_SCROLL_OFFSET,
      });
    }
  }, [currentIndex]);

  const goTo = (index: number, shouldPlay: boolean) => {
    setIsPlaying(shouldPlay);
    if (index !== currentIndex) {
      setCurrentIndex(index);
      return;
    }
    // same verse, so restart it
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      if (shouldPlay) {
        play(audio);
      }
    }
  };

  const prev = () => goTo(Math.max(currentIndex - 1, 0), true);
  const next = () => {
    const isLast = currentIndex === audioUrls.length - 1;
    if (isLast) {
      goTo(0, loop);
    } else {
      goTo(currentIndex + 1, true);
    }
  };

  return (
    <div className="relative h-full">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={audioUrls[currentIndex]} onEnded={next} preload="auto" />
      {audioUrls[currentIndex + 1] && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio src={audioUrls[currentIndex + 1]} preload="auto" />
      )}
      <Progress
        className="absolute inset-x-0 top-0 m-0 leading-none"
        percent={((currentIndex + 1) / audioUrls.length) * 100}
        showInfo={false}
        strokeColor="var(--primary-color)"
        size={{ height: 3 }}
        aria-label={t("recitation-progress", { current: start + currentIndex, total: start + audioUrls.length - 1 })}
      />
      <Row justify="center" className="h-full">
        <Col className="h-full w-full max-w-md">
          <Row justify="space-between" align="middle" className="h-full">
            <Col>
              <Button
                className="px-2"
                type={autoScroll ? "primary" : "link"}
                size="large"
                aria-label={t("auto-scroll")}
                aria-pressed={autoScroll}
                onClick={() => setAutoScroll((val) => !val)}
              >
                <ColumnHeightOutlined aria-hidden className="text-2xl" />
              </Button>
            </Col>
            <Col>
              <Button
                className="px-2"
                type={loop ? "primary" : "link"}
                size="large"
                aria-label={t("loop")}
                aria-pressed={loop}
                onClick={() => setLoop((val) => !val)}
              >
                <SyncOutlined aria-hidden className="text-2xl" />
              </Button>
            </Col>
            <Col>
              <Button className="px-2" type="link" size="large" aria-label={t("previous-verse")} onClick={prev}>
                <StepBackwardOutlined aria-hidden className="text-2xl" />
              </Button>
            </Col>
            <Col>
              <Button
                className="px-2"
                type="link"
                size="large"
                aria-label={isPlaying ? t("pause") : t("play")}
                onClick={() => setIsPlaying((val) => !val)}
              >
                {isPlaying ? (
                  <PauseCircleOutlined aria-hidden className="text-2xl" />
                ) : (
                  <PlayCircleOutlined aria-hidden className="text-2xl" />
                )}
              </Button>
            </Col>
            <Col>
              <Button
                className="px-2"
                disabled={currentIndex === audioUrls.length - 1 && !loop}
                type="link"
                size="large"
                aria-label={t("next-verse")}
                onClick={next}
              >
                <StepForwardOutlined aria-hidden className="text-2xl" />
              </Button>
            </Col>
            <Col>
              <Popover
                content={
                  <Space orientation="vertical">
                    <div className="h-52 grid place-items-center">
                      <Slider
                        vertical
                        value={volume}
                        min={0}
                        max={1}
                        step={0.01}
                        ariaLabelForHandle={t("volume-level")}
                        onChange={(val) => {
                          setVolume(val);
                          setMuted(false);
                        }}
                        tooltip={{
                          formatter: (val) => ((val || 0) * 100).toFixed(0),
                        }}
                      />
                    </div>
                    <Button
                      type="link"
                      aria-label={muted ? t("unmute") : t("mute")}
                      onClick={() => setMuted((val) => !val)}
                    >
                      {muted ? (
                        <BsVolumeMute aria-hidden fontSize="2rem" />
                      ) : (
                        <BsVolumeUp aria-hidden fontSize="2rem" />
                      )}
                    </Button>
                  </Space>
                }
                placement="top"
                trigger="click"
              >
                <Button className="px-2" type="link" size="large" aria-label={t("volume")}>
                  <SoundOutlined aria-hidden className="text-2xl" />
                </Button>
              </Popover>
            </Col>
            <Col>
              <Button className="px-2" type="link" size="large" aria-label={t("play-options")} onClick={onOpenSettings}>
                <SettingOutlined aria-hidden className="text-2xl" />
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default AudioBar;
