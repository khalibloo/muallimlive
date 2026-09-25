"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Col, Drawer, FloatButton, Grid, Menu, Modal, Popconfirm, Row, Tooltip, Typography } from "antd";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useBoolean } from "ahooks";
import clsx from "clsx";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { range } from "lodash-es";
import { MenuOutlined, PlayCircleFilled, ReadOutlined } from "@ant-design/icons";

import Verse from "@/components/Verse";
import PlayForm, { PlayConfig } from "@/components/PlayForm";
import AudioBar from "@/components/AudioBar";
import lf from "@/utils/localforage";

interface Props {
  chapter: Chapter;
  leftContent: VerseText[][];
  rightContent: VerseText[][];
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
  const t = useTranslations("common");
  const responsive = Grid.useBreakpoint();
  const chapterNumber = currentChapter.id;
  const [readerMode, setReaderMode] = useState<"reading" | "recitation">("reading");
  const [chaptersDrawerOpen, { setTrue: openChaptersDrawer, setFalse: closeChaptersDrawer }] = useBoolean(false);
  const [playModalOpen, { setTrue: openPlayModal, setFalse: closePlayModal }] = useBoolean(false);

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

  useEffect(() => {
    let cancelled = false;
    let subscription: Subscription | undefined;
    const getSurahFaves = (favesData: unknown) =>
      Array.isArray(favesData) ? favesData.filter((f: string) => f.startsWith(`${chapterNumber}:`)) : [];

    lf.ready().then(() => {
      if (cancelled) {
        return;
      }
      lf.getItem("faves-quran").then((favesData) => {
        if (!cancelled) {
          setFaves(getSurahFaves(favesData));
        }
      });

      // sync localforage across tabs
      lf.configObservables({
        crossTabNotification: true,
        crossTabChangeDetection: true,
      });
      subscription = lf
        .newObservable({
          key: "faves-quran",
          crossTabNotification: true,
        })
        .subscribe({
          next: (args) => setFaves(getSurahFaves(args.newValue)),
        });
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [chapterNumber]);

  // restore progress
  useEffect(() => {
    lf.ready().then(() => {
      lf.getItem(`progress-surah-${chapterNumber}`).then((progress) => {
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
  }, [chapterNumber]);

  const verseList = range(currentChapter.verses_count).map((i) => ({
    left: leftContent.map((c) => c?.[i]).filter(Boolean),
    right: rightContent.map((c) => c?.[i]).filter(Boolean),
  }));

  const navButtonClassName = clsx("h-full border-none rounded-none", { "px-3": !responsive.md });

  return (
    <>
      <FloatButton.BackTop aria-label={t("back-to-top")} />
      <Drawer
        placement="left"
        closable={false}
        styles={{ body: { padding: 0 } }}
        onClose={closeChaptersDrawer}
        open={chaptersDrawerOpen}
        title={null}
      >
        <nav aria-label={t("chapters")}>
          <Menu
            theme="dark"
            selectedKeys={[`${currentChapter.id}`]}
            mode="inline"
            onClick={closeChaptersDrawer}
            items={chapters?.chapters.map((chapter) => ({
              key: `${chapter.id}`,
              className: "text-left",
              label: (
                <Link href={`/chapters/${chapter.id}`}>
                  <Tooltip classNames={{ root: "capitalize" }} title={chapter.translated_name.name} placement="right">
                    <Typography.Text className="capitalize">
                      <span className="mr-2">{chapter.id}</span> {chapter.name_simple}
                    </Typography.Text>
                  </Tooltip>
                </Link>
              ),
            }))}
          />
        </nav>
      </Drawer>
      <Modal destroyOnHidden title={t("play-options")} onCancel={closePlayModal} open={playModalOpen} footer={null}>
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
            <Button className={navButtonClassName} aria-label={t("chapters")} onClick={openChaptersDrawer}>
              <MenuOutlined aria-hidden className="text-xl" />
              {responsive.md && t("chapters")}
            </Button>
          </div>
          <div className="grow p-3 text-center">
            <Typography.Title
              level={1}
              ellipsis={{
                tooltip: `${currentChapter.name_simple} - ${currentChapter.translated_name.name}`,
              }}
              className="capitalize text-lg m-0"
              style={{ fontWeight: responsive.md ? 600 : 400 }}
            >
              {currentChapter.name_simple} - {currentChapter.translated_name.name}
            </Typography.Title>
          </div>
          {readerMode === "reading" ? (
            <div>
              <Button className={navButtonClassName} aria-label={t("recite")} onClick={openPlayModal} type="primary">
                <PlayCircleFilled aria-hidden className="text-xl" />
                {responsive.md && t("recite")}
              </Button>
            </div>
          ) : (
            <div>
              <Popconfirm
                title={t("stop-recitation-confirm")}
                onConfirm={() => {
                  setReaderMode("reading");
                  setIsPlayingVerses(false);
                }}
                okText={t("yes")}
                cancelText={t("no")}
                placement="bottomRight"
              >
                <Button className={navButtonClassName} aria-label={t("read")} type="primary">
                  <ReadOutlined aria-hidden className="text-xl" />
                  {responsive.md && t("read")}
                </Button>
              </Popconfirm>
            </div>
          )}
        </div>
      </div>
      <Row className="mt-13 py-6 grow" justify="center">
        <Col span={24}>
          <Virtuoso
            data={verseList}
            useWindowScroll
            ref={virtualListRef}
            itemContent={(i, item) => (
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
                    hideTafsirs={readerMode === "recitation" && playbackConfig.hideTafsirs}
                    audioUrl={versesRecitations?.find((a) => a.verse_key === `${chapterNumber}:${i + 1}`)?.url}
                    onPlay={() => {
                      setPlayingVerseNumber(i + 1);
                      setIsPlayingVerses(false);
                    }}
                    onEnded={() => setPlayingVerseNumber(-1)}
                    isPlaying={playingVerseNumber === i + 1}
                    muted={muted}
                    volume={volume}
                  />
                </Col>
              </Row>
            )}
          />
        </Col>
      </Row>
      <Drawer
        placement="bottom"
        aria-label={t("audio-player")}
        open={readerMode === "recitation"}
        mask={false}
        size={48}
        closable={false}
        styles={{ header: { display: "none" }, body: { padding: 0 } }}
      >
        {readerMode === "recitation" && (
          <AudioBar
            key={`${playbackConfig.start}-${playbackConfig.end}-${playbackConfig.reciter}`}
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
