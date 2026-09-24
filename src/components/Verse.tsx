import React, { useEffect, useRef } from "react";
import { Row, Col, Typography, Space, Divider, Tooltip, Button, Grid } from "antd";
import { useInView } from "react-intersection-observer";
import clsx from "clsx";
import { PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";

import lf from "@/utils/localforage";
import Fave from "./Fave";
import Notes from "./Notes";
import SafeHtml from "./SafeHtml";

interface Props {
  verseNumber: number;
  chapterNumber: number;
  faved: boolean;
  totalVerses: number;
  left: VerseText[];
  right: VerseText[];
  hideTafsirs?: boolean;
  audioUrl?: string;
  onPlay: () => void;
  onEnded: () => void;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
}

const Verse: React.FC<Props> = ({
  verseNumber,
  chapterNumber,
  totalVerses,
  faved,
  audioUrl,
  left,
  right,
  hideTafsirs,
  onPlay,
  onEnded,
  isPlaying,
  muted,
  volume,
}) => {
  const responsive = Grid.useBreakpoint();
  const audioRef = useRef<HTMLAudioElement>(null);
  const split = left.length > 0 && right.length > 0;
  const leftColSpan = split ? 12 : 24;
  const rightColSpan = split ? 12 : 24;
  const leftItems = (hideTafsirs ? left.filter((v) => !v.isTafsir) : left).filter((v) => v.text);
  const rightItems = hideTafsirs ? right.filter((v) => !v.isTafsir) : right;

  const { ref } = useInView({
    rootMargin: "-200px 0px",
    onChange: (inView) => {
      const key = `progress-surah-${chapterNumber}`;

      if (window.scrollY < 200 || verseNumber === totalVerses) {
        lf.removeItem(key);
      } else if (inView) {
        lf.setItem(key, verseNumber);
      }
    },
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (isPlaying) {
      audio.currentTime = 0;
      audio.play().catch(onEnded);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  return (
    <div ref={ref}>
      <Row gutter={24} id={`v-${verseNumber}`} className="mt-6 w-full items-stretch">
        {left.length > 0 && (
          <Col
            span={leftColSpan}
            xs={24}
            md={leftColSpan}
            style={{
              borderRight: split && responsive.md ? "1px solid #666" : undefined,
            }}
          >
            <div className="flex gap-2">
              <div className="py-3">{verseNumber})</div>
              <ul className="grow list-none m-0 p-0 divide-y divide-white/10">
                {leftItems.map((v, i) => (
                  <li key={v.id ?? i} className="py-3">
                    {v.isHTML ? (
                      <SafeHtml className="font-light" html={v.text} />
                    ) : (
                      <Typography.Text
                        className={clsx({
                          "text-lg": v.isBold && !v.isArabic,
                          "text-2xl": v.isArabic,
                          "text-arabic": v.isArabic,
                        })}
                        strong={v.isBold}
                      >
                        {v.text}
                      </Typography.Text>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Col>
        )}
        {right.length > 0 && (
          <Col span={rightColSpan} xs={24} md={rightColSpan}>
            <ul className="list-none m-0 p-0 divide-y divide-white/10">
              {rightItems.map((v, i) => (
                <li key={v.id ?? i} className={clsx("w-full py-3", { "text-right": v.isArabic })}>
                  {v.isHTML ? (
                    <SafeHtml
                      className={clsx({
                        "text-lg": v.isBold && !v.isArabic,
                        "text-4xl": v.isArabic,
                        "text-arabic": v.isArabic,
                        "font-light": !v.isArabic,
                        "font-bold": v.isBold,
                      })}
                      html={v.text}
                    />
                  ) : (
                    <Typography.Text
                      className={clsx({
                        "text-lg": v.isBold && !v.isArabic,
                        "text-4xl": v.isArabic,
                        "text-arabic": v.isArabic,
                      })}
                      strong={v.isBold}
                    >
                      {v.text}
                    </Typography.Text>
                  )}
                </li>
              ))}
            </ul>
          </Col>
        )}
      </Row>
      <div>
        <Space separator={<Divider orientation="vertical" />}>
          <Fave faved={faved} chapterNumber={chapterNumber} verseNumber={verseNumber} />
          <Notes chapterNumber={chapterNumber} verseNumber={verseNumber} />
          <Tooltip title={isPlaying ? "Stop verse" : "Play verse"}>
            <Button
              type="text"
              aria-label={isPlaying ? "Stop verse" : "Play verse"}
              onClick={() => {
                if (!isPlaying) {
                  onPlay();
                } else {
                  onEnded();
                }
              }}
            >
              {!isPlaying ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            </Button>
          </Tooltip>
        </Space>
        {audioUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio ref={audioRef} src={audioUrl} preload="none" onEnded={onEnded} />
        )}
      </div>
    </div>
  );
};

export default Verse;
