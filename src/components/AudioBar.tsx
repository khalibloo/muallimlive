import React, { useEffect, useRef, useState } from "react";
import { Row, Col, Button, Popover, Slider, Space } from "antd";
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
}

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
}) => {
  const t = useTranslations("common");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loop, setLoop] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted, currentIndex]);

  useEffect(() => {
    if (autoScroll) {
      virtualListRef.current?.scrollToIndex({
        index: start - 1 + currentIndex,
        align: "start",
        behavior: "smooth",
      });
    }
  }, [currentIndex]);

  const goTo = (index: number, play: boolean) => {
    setIsPlaying(play);
    if (index !== currentIndex) {
      setCurrentIndex(index);
      return;
    }
    // same verse, so restart it
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      if (play) {
        audio.play().catch(() => setIsPlaying(false));
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

  const iconStyle = { fontSize: "1.5rem" };
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={audioUrls[currentIndex]}
        onEnded={next}
        preload="auto"
        data-testid="recitation-audio"
      />
      {audioUrls[currentIndex + 1] && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio src={audioUrls[currentIndex + 1]} preload="auto" />
      )}
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
                <ColumnHeightOutlined style={iconStyle} />
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
                <SyncOutlined style={iconStyle} />
              </Button>
            </Col>
            <Col>
              <Button className="px-2" type="link" size="large" aria-label={t("previous-verse")} onClick={prev}>
                <StepBackwardOutlined style={iconStyle} />
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
                {isPlaying ? <PauseCircleOutlined style={iconStyle} /> : <PlayCircleOutlined style={iconStyle} />}
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
                <StepForwardOutlined style={iconStyle} />
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
                        aria-label={t("volume-level")}
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
                      {muted ? <BsVolumeMute fontSize="2rem" /> : <BsVolumeUp fontSize="2rem" />}
                    </Button>
                  </Space>
                }
                placement="top"
                trigger="click"
              >
                <Button className="px-2" type="link" size="large" aria-label={t("volume")}>
                  <SoundOutlined style={iconStyle} />
                </Button>
              </Popover>
            </Col>
            <Col>
              <Button className="px-2" type="link" size="large" aria-label={t("play-options")} onClick={onOpenSettings}>
                <SettingOutlined style={iconStyle} />
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );
};

export default AudioBar;
