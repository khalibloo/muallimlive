import React, { useEffect, useRef } from "react";
import { Row, Col, Typography, Space, Tooltip, Button } from "antd";
import { useInView } from "react-intersection-observer";
import clsx from "clsx";
import { PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

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
  /** Marks the verse being recited */
  highlighted?: boolean;
}

/** Verse text scales with the reader's text size; Arabic in the right pane is the larger script */
const verseTextClassName = (v: VerseText, rightPane?: boolean) =>
  clsx({
    "text-arabic": v.isArabic,
    "text-verse-arabic": v.isArabic && !rightPane,
    "text-verse-arabic-lg": v.isArabic && rightPane,
    "text-verse-sm text-secondary font-light": v.isTafsir && !v.isArabic,
    "text-verse-lg": v.isBold && !v.isArabic && !v.isTafsir,
    "text-verse": !v.isArabic && !v.isBold && !v.isTafsir,
  });

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
  highlighted,
}) => {
  const t = useTranslations("common");
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
      if (inView) {
        lf.setItem<LastRead>("last-read", { chapter: chapterNumber, verse: verseNumber });
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
    <article
      ref={ref}
      aria-label={t("verse-label", { verse: verseNumber })}
      aria-current={highlighted || undefined}
      className={clsx("rounded-xl border bg-surface px-4 md:px-6 py-4 transition-colors", {
        "border-line": !highlighted,
        "border-primary ring-1 ring-primary": highlighted,
      })}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="verse-badge">{verseNumber}</span>
        <Space>
          <Fave faved={faved} chapterNumber={chapterNumber} verseNumber={verseNumber} />
          <Notes chapterNumber={chapterNumber} verseNumber={verseNumber} />
          <Tooltip title={isPlaying ? t("stop-verse") : t("play-verse")}>
            <Button
              type="text"
              aria-label={isPlaying ? t("stop-verse") : t("play-verse")}
              onClick={() => {
                if (!isPlaying) {
                  onPlay();
                } else {
                  onEnded();
                }
              }}
            >
              {!isPlaying ? <PlayCircleOutlined aria-hidden /> : <PauseCircleOutlined aria-hidden />}
            </Button>
          </Tooltip>
        </Space>
        {audioUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio ref={audioRef} src={audioUrl} preload="none" onEnded={onEnded} />
        )}
      </div>
      <Row gutter={24} id={`v-${verseNumber}`} className="items-stretch">
        {left.length > 0 && (
          <Col span={leftColSpan} xs={24} md={leftColSpan} className={clsx("border-line", { "md:border-r": split })}>
            <ul className="list-none m-0 p-0 divide-y divide-line">
              {leftItems.map((v, i) => (
                // items are one verse's text from each configured source, so ids repeat but order is stable
                <li key={i} className={clsx("py-3", { "text-right": v.isArabic })}>
                  {v.isHTML ? (
                    <SafeHtml className={verseTextClassName(v)} html={v.text} />
                  ) : (
                    <Typography.Text className={verseTextClassName(v)} strong={v.isBold}>
                      {v.text}
                    </Typography.Text>
                  )}
                </li>
              ))}
            </ul>
          </Col>
        )}
        {right.length > 0 && (
          <Col span={rightColSpan} xs={24} md={rightColSpan}>
            <ul className="list-none m-0 p-0 divide-y divide-line">
              {rightItems.map((v, i) => (
                <li key={i} className={clsx("w-full py-3", { "text-right": v.isArabic })}>
                  {v.isHTML ? (
                    <SafeHtml className={clsx(verseTextClassName(v, true), { "font-bold": v.isBold })} html={v.text} />
                  ) : (
                    <Typography.Text className={verseTextClassName(v, true)} strong={v.isBold}>
                      {v.text}
                    </Typography.Text>
                  )}
                </li>
              ))}
            </ul>
          </Col>
        )}
      </Row>
    </article>
  );
};

export default Verse;
