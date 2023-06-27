"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Col, Drawer, FloatButton, Grid, Menu, Modal, Popconfirm, Row, Tooltip, Typography } from "antd";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useBoolean } from "ahooks";
import clsx from "clsx";
import Link from "next/link";
import { range } from "lodash";
import { MenuOutlined, PlayCircleFilled, ReadOutlined } from "@ant-design/icons";

import Verse from "@/components/Verse";
import PlayForm, { PlayConfig } from "@/components/PlayForm";
import AudioBar from "@/components/AudioBar";
import lf from "@/utils/localforage";

interface Props {
  chapter: Chapter;
  leftContent: (VerseText[] | Translation[] | null)[];
  rightContent: (VerseText[] | Translation[] | null)[];
  chapters: { chapters: Chapter[] };
  versesRecitations: { id: number; url: string; verse_key: string }[];
  recitations: GetRecitationsResponse;
  playerSettings: PlaySettings;
}

const Chapter: React.FC<Props> = ({
  chapter: currentChapter,
  chapters,
  leftContent,
  rightContent,
  versesRecitations,
  recitations,
  playerSettings,
}) => {
  const responsive = Grid.useBreakpoint();
  const chapterNumber = currentChapter.id;
  const [readerMode, setReaderMode] = useState<"reading" | "recitation">("reading");
  const [chaptersDrawerOpen, { setTrue: openChaptersDrawer, setFalse: closeChaptersDrawer }] = useBoolean(false);
  const [playModalOpen, { setTrue: openPlayModal, setFalse: closePlayModal }] = useBoolean(false);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);

  const virtualListRef = useRef<VirtuosoHandle>(null);

  const [faves, setFaves] = useState<string[]>([]);
  const [playbackConfig, setPlaybackConfig] = useState<PlayConfig>({
    ...playerSettings,
    start: 1,
    end: currentChapter.verses_count,
  });
  const [isPlayingVerses, setIsPlayingVerses] = useState(false);
  const [playingVerseNumber, setPlayingVerseNumber] = useState<number>();
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  React.useEffect(() => {
    lf.ready().then(() => {
      lf.getItem("faves-quran").then((favesData) => {
        if (typeof (favesData as string[])?.length === "number") {
          const surahFaves = (favesData as string[]).filter((f) => f.startsWith(`${chapterNumber}:`));
          setFaves(surahFaves);
        }
      });

      // sync localforage across tabs
      lf.configObservables({
        crossTabNotification: true,
        crossTabChangeDetection: true,
      });
      const ob = lf.newObservable({
        key: "faves-quran",
        crossTabNotification: true,
      });

      ob.subscribe({
        next: (args) => {
          const surahFaves = args.newValue.filter((f: any) => f.startsWith(`${chapterNumber}:`));
          setFaves(surahFaves);
        },
      });
    });
  }, [chapterNumber]);

  // exit recitation mode if chapter changes
  useEffect(() => {
    setReaderMode("reading");
  }, [chapterNumber]);

  // restore progress
  React.useEffect(() => {
    if (hasRestoredProgress || !virtualListRef.current) {
      return;
    }
    const key = `progress-surah-${chapterNumber}`;
    lf.ready().then(() => {
      lf.getItem(key).then((progress) => {
        // validation
        if (typeof progress === "number" && progress > 0 && progress <= currentChapter.verses_count) {
          virtualListRef.current?.scrollToIndex({
            index: progress - 1,
            align: "start",
            behavior: "smooth",
          });
        }
      });
    });
    setHasRestoredProgress(true);
  }, [virtualListRef.current]);

  const verseList: { left: VerseText[]; right: VerseText[] }[] = [];
  range(currentChapter.verses_count).forEach((i) => {
    const l = leftContent.map((c: any) => c?.[i]);
    const r = rightContent.map((c: any) => c?.[i]);

    if (![...l, ...r].includes(undefined)) {
      verseList.push({ left: l as VerseText[], right: r as VerseText[] });
    }
  });

  return (
    <>
      <FloatButton.BackTop />
      <Drawer
        placement="left"
        closable={false}
        bodyStyle={{ padding: 0 }}
        onClose={closeChaptersDrawer}
        open={chaptersDrawerOpen}
      >
        <Menu theme="dark" selectedKeys={[`${currentChapter.id}`]} mode="inline">
          {chapters?.chapters.map((chapter) => (
            <Menu.Item key={chapter.id} className="text-left" onClick={closeChaptersDrawer}>
              <Link href={`/chapters/${chapter.id}`}>
                <Tooltip overlayClassName="capitalize" title={chapter.translated_name.name} placement="right">
                  <Typography.Text className="capitalize">
                    <span className="mr-3">{chapter.id}</span>
                    {chapter.name_simple}
                  </Typography.Text>
                </Tooltip>
              </Link>
            </Menu.Item>
          ))}
        </Menu>
      </Drawer>
      <Modal destroyOnClose title="Play Options" onCancel={closePlayModal} open={playModalOpen} footer={null}>
        <PlayForm
          recitations={recitations}
          verseCount={currentChapter.verses_count}
          playSettings={playerSettings}
          onSubmit={(playerSettingsData) => {
            setReaderMode("recitation");
            closePlayModal();
            setPlaybackConfig(playerSettingsData);
            setIsPlayingVerses(true);
          }}
        />
      </Modal>
      <div className="fixed top-16 shadow-md bg-444 w-full z-10">
        <div className="flex items-stretch">
          <div>
            <Button
              className={clsx("h-full border-none rounded-none", {
                "px-3": !responsive.md,
              })}
              onClick={openChaptersDrawer}
            >
              <MenuOutlined className="text-xl" />
              {responsive.md && "Chapters"}
            </Button>
          </div>
          <div className="flex-grow p-3 text-center">
            <Typography.Text
              ellipsis={{
                tooltip: `${currentChapter.name_simple} - ${currentChapter.translated_name.name}`,
              }}
              className="capitalize text-lg"
              strong={responsive.md}
            >
              {currentChapter.name_simple} - {currentChapter.translated_name.name}
            </Typography.Text>
          </div>
          {readerMode === "reading" ? (
            <div>
              <Button
                className={clsx("h-full border-none rounded-none", {
                  "px-3": !responsive.md,
                })}
                onClick={openPlayModal}
                type="primary"
              >
                <PlayCircleFilled className="text-xl" />
                {responsive.md && " Recite"}
              </Button>
            </div>
          ) : (
            <div>
              <Popconfirm
                title="Stop recitation?"
                onConfirm={() => setReaderMode("reading")}
                okText="Yes"
                cancelText="No"
                placement="bottomRight"
              >
                <Button
                  className={clsx("h-full border-none rounded-none", {
                    "px-3": !responsive.md,
                  })}
                  type="primary"
                >
                  <ReadOutlined className="text-xl" />
                  {responsive.md && " Read"}
                </Button>
              </Popconfirm>
            </div>
          )}
        </div>
      </div>
      <Row className="mt-13 py-6 flex-grow" justify="center">
        <Col span={24}>
          <Virtuoso
            data={verseList}
            useWindowScroll
            ref={virtualListRef}
            // eslint-disable-next-line react/no-unstable-nested-components
            itemContent={(i) => {
              const item = verseList[i];
              return (
                <div key={i}>
                  <Row justify="center">
                    <Col
                      span={22}
                      className="py-3"
                      style={{
                        borderBottom: i === verseList.length - 1 ? undefined : "1px solid #666",
                      }}
                    >
                      <Verse
                        verseNumber={i + 1}
                        chapterNumber={chapterNumber}
                        faved={faves.includes(`${chapterNumber}:${i + 1}`)}
                        totalVerses={currentChapter.verses_count}
                        left={item.left}
                        right={item.right}
                        hideTafsirs={readerMode === "recitation" && playerSettings.hideTafsirs}
                        audioUrl={versesRecitations?.find((a) => a.verse_key === `${chapterNumber}:${i + 1}`)?.url}
                        onPlay={() => {
                          setPlayingVerseNumber(i + 1);
                          setIsPlayingVerses(false);
                        }}
                        onEnded={() => setPlayingVerseNumber(-1)}
                        isPlaying={playingVerseNumber === i + 1}
                        muted={muted}
                        // setMuted={setMuted}
                        volume={volume}
                        // setVolume={setVolume}
                      />
                    </Col>
                  </Row>
                </div>
              );
            }}
          />
        </Col>
      </Row>
      <Drawer
        placement="bottom"
        open={readerMode === "recitation"}
        mask={false}
        height={48}
        headerStyle={{ display: "none" }}
        closeIcon={false}
        bodyStyle={{ padding: 0 }}
      >
        {readerMode === "recitation" && (
          <AudioBar
            audioUrls={versesRecitations.slice(playbackConfig.start - 1, playbackConfig.end).map((a) => a.url)}
            start={playbackConfig.start}
            isPlaying={isPlayingVerses}
            setIsPlaying={setIsPlayingVerses}
            onOpenSettings={openPlayModal}
            muted={muted}
            setMuted={setMuted}
            volume={volume}
            setVolume={setVolume}
            virtualListRef={virtualListRef}
          />
        )}
      </Drawer>
    </>
  );
};

export default Chapter;
