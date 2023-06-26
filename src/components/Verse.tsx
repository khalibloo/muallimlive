import React, { createRef } from "react";
import { Row, Col, Typography, List, Space, Divider, Tooltip, Button } from "antd";
import VisibilitySensor from "react-visibility-sensor";
import clsx from "clsx";
import { useResponsive } from "ahooks";
import { PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";
import ReactPlayer from "react-player";

import lf from "@/utils/localforage";
import Fave from "./Fave";
import Notes from "./Notes";

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
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  muted: boolean;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
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
  setMuted,
  volume,
  setVolume,
}) => {
  const responsive = useResponsive();
  const audioRef = createRef<ReactPlayer>();
  const split = left.length > 0 && right.length > 0;
  const leftColSpan = split && right.length > 0 ? 12 : 24;
  const rightColSpan = split && left.length > 0 ? 12 : 24;

  return (
    <VisibilitySensor
      offset={{ top: 200, bottom: 200 }}
      partialVisibility
      onChange={(isVisible: boolean) => {
        const key = `progress-surah-${chapterNumber}`;

        if (window.scrollY < 200 || verseNumber === totalVerses) {
          lf.removeItem(key);
        } else if (isVisible) {
          lf.setItem(key, verseNumber);
        }
      }}
    >
      <>
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
                <div className="flex-grow">
                  <List
                    dataSource={hideTafsirs ? left.filter((v) => !v.isTafsir) : left}
                    renderItem={(v) => (
                      <List.Item key={v.id}>
                        <div>
                          {v.isHTML ? (
                            <div className="font-light" dangerouslySetInnerHTML={{ __html: v.text }} />
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
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              </div>
            </Col>
          )}
          {right.length > 0 && (
            <Col span={rightColSpan} xs={24} md={rightColSpan}>
              <List
                dataSource={hideTafsirs ? right.filter((v) => !v.isTafsir) : right}
                renderItem={(v) => (
                  <List.Item key={v.id}>
                    <div className={clsx("w-full", { "text-right": v.isArabic })}>
                      {v.isHTML ? (
                        <div
                          className={clsx({
                            "text-lg": v.isBold && !v.isArabic,
                            "text-4xl": v.isArabic,
                            "text-arabic": v.isArabic,
                            "font-light": v.isHTML && !v.isArabic,
                            "font-bold": v.isBold,
                          })}
                          dangerouslySetInnerHTML={{ __html: v.text }}
                        />
                      ) : (
                        <Typography.Text
                          className={clsx({
                            "text-lg": v.isBold && !v.isArabic,
                            "text-4xl": v.isArabic,
                            "text-arabic": v.isArabic,
                            "font-light": v.isHTML && !v.isArabic,
                          })}
                          strong={v.isBold}
                        >
                          {v.text}
                        </Typography.Text>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            </Col>
          )}
        </Row>
        <div>
          <Space split={<Divider type="vertical" />}>
            <Fave faved={faved} chapterNumber={chapterNumber} verseNumber={verseNumber} />
            <Notes chapterNumber={chapterNumber} verseNumber={verseNumber} />
            <Tooltip title="Play verse">
              <Button
                type="text"
                onClick={() => {
                  if (!isPlaying) {
                    audioRef.current?.seekTo(0);
                    onPlay();
                  } else {
                    onEnded();
                  }
                }}
              >
                {!isPlaying ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              </Button>
              {audioUrl && (
                <ReactPlayer
                  controls={false}
                  url={audioUrl}
                  playing={isPlaying}
                  onEnded={() => {
                    onEnded();
                  }}
                  style={{ display: "none" }}
                  stopOnUnmount
                  volume={muted ? 0 : volume}
                  ref={audioRef}
                />
              )}
            </Tooltip>
          </Space>
        </div>
      </>
    </VisibilitySensor>
  );
};

export default Verse;
