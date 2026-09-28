"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Col, Drawer, Empty, FloatButton, Grid, Input, Menu, Modal, Popconfirm, Row, Typography } from "antd";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useBoolean } from "ahooks";
import clsx from "clsx";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { range, uniqBy } from "lodash-es";
import { MenuOutlined, PlayCircleFilled, ReadOutlined, SearchOutlined } from "@ant-design/icons";

import Verse from "@/components/Verse";
import PlayForm, { PlayConfig } from "@/components/PlayForm";
import AudioBar, { VERSE_SCROLL_OFFSET } from "@/components/AudioBar";
import { useSetCurrentChapter } from "@/components/ChapterSearchContext";
import { chapterPath, searchChapters } from "@/utils/chapters";
import lf from "@/utils/localforage";
import { getContentPack, packKey } from "@/utils/packs";
import { FAVES_KEY, liveFaves, readFaves, verseKey } from "@/utils/userData";
import ChapterHeader from "./ChapterHeader";

interface Props {
  chapter: Chapter;
  leftContent: VerseText[][];
  rightContent: VerseText[][];
  /** The settings the content was loaded for, one item per content list */
  readerSettings: ReaderSettings;
  chapters: { chapters: Chapter[] };
  versesRecitations: { id: number; url: string; verse_key: string }[];
  recitations: GetRecitationsResponse;
  playerSettings: PlaySettings;
  /** Shown above the verses */
  notice?: React.ReactNode;
}

const Chapter: React.FC<Props> = ({
  chapter: currentChapter,
  chapters,
  leftContent,
  rightContent,
  readerSettings,
  versesRecitations,
  recitations,
  playerSettings,
  notice,
}) => {
  const t = useTranslations("common");
  const responsive = Grid.useBreakpoint();
  const chapterNumber = currentChapter.id;
  const [readerMode, setReaderMode] = useState<"reading" | "recitation">("reading");
  const [chaptersDrawerOpen, { setTrue: openChaptersDrawer, setFalse: closeChaptersDrawer }] = useBoolean(false);
  const [chapterQuery, setChapterQuery] = useState("");
  const [playModalOpen, { setTrue: openPlayModal, setFalse: closePlayModal }] = useBoolean(false);

  const virtualListRef = useRef<VirtuosoHandle>(null);
  const setSearchChapter = useSetCurrentChapter();

  const [faves, setFaves] = useState<string[]>([]);
  const [playbackConfig, setPlaybackConfig] = useState<PlayConfig>({
    ...playerSettings,
    start: 1,
    end: currentChapter.verses_count,
  });
  const [isPlayingVerses, setIsPlayingVerses] = useState(false);
  const [playingVerseNumber, setPlayingVerseNumber] = useState<number>();
  const [recitingVerse, setRecitingVerse] = useState<number>();
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    let cancelled = false;
    let subscription: Subscription | undefined;
    // takes readFaves()'s list or a stored record from the observable
    const getSurahFaves = (favesData: unknown) =>
      (Array.isArray(favesData) ? favesData : liveFaves(favesData)).filter((f: string) =>
        f.startsWith(`${chapterNumber}:`),
      );

    lf.ready().then(() => {
      if (cancelled) {
        return;
      }
      readFaves().then((favesData) => {
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
          key: FAVES_KEY,
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

  const scrollToVerse = (verse: unknown) => {
    if (typeof verse === "number" && verse > 0 && verse <= currentChapter.verses_count) {
      virtualListRef.current?.scrollToIndex({
        index: verse - 1,
        align: "start",
        behavior: "smooth",
        offset: VERSE_SCROLL_OFFSET,
      });
      return true;
    }
    return false;
  };

  // the verse search searches the texts on the page, one per pack, while the chapter is open. The deps are props
  // that only change with the content, and too large to deep-compare on every render.
  useEffect(() => {
    const items = [...readerSettings.left, ...readerSettings.right];
    const contents = [...leftContent, ...rightContent];
    const texts = uniqBy(
      items.flatMap((item, i) => {
        const pack = getContentPack(item);
        return pack && contents[i] ? [{ pack, verses: contents[i] }] : [];
      }),
      ({ pack }) => packKey(pack),
    );
    setSearchChapter({ chapter: currentChapter, texts, goToVerse: scrollToVerse });
    return () => setSearchChapter(undefined);
  }, [currentChapter, leftContent, rightContent, readerSettings]);

  // jump to a shared verse (#v-N), otherwise restore progress
  useEffect(() => {
    const hashVerse = /^#v-(\d+)$/.exec(window.location.hash)?.[1];
    // after storage is ready, so the list has measured its first items
    lf.ready().then(async () => {
      // opening a chapter makes it the one to continue, even before a verse scrolls into view; written before
      // scrolling so it can't overwrite the verse that scroll brings into view
      const lastRead = await lf.getItem<LastRead>("last-read");
      if (lastRead?.chapter !== chapterNumber) {
        await lf.setItem<LastRead>("last-read", { chapter: chapterNumber, verse: 1 });
      }
      if (!scrollToVerse(Number(hashVerse))) {
        lf.getItem(`progress-surah-${chapterNumber}`).then(scrollToVerse);
      }
    });
  }, [chapterNumber]);

  const verseList = range(currentChapter.verses_count).map((i) => ({
    left: leftContent.map((c) => c?.[i]).filter(Boolean),
    right: rightContent.map((c) => c?.[i]).filter(Boolean),
  }));

  const filteredChapters = searchChapters(chapters.chapters, chapterQuery);
  const highlightedVerse = readerMode === "recitation" ? recitingVerse : playingVerseNumber;

  const chapterTitle = t("chapter-title", {
    name: currentChapter.name_simple,
    translation: currentChapter.translated_name.name,
  });

  const navButtonClassName = clsx("h-full border-none rounded-none", { "px-3": !responsive.md });

  return (
    <>
      <FloatButton.BackTop aria-label={t("back-to-top")} />
      <Drawer
        placement="left"
        closable={false}
        styles={{ body: { padding: 0 } }}
        onClose={closeChaptersDrawer}
        afterOpenChange={(open) => !open && setChapterQuery("")}
        open={chaptersDrawerOpen}
        title={null}
      >
        <div className="sticky top-0 z-10 p-4 bg-surface-elevated">
          <Input
            allowClear
            aria-label={t("search-chapters")}
            placeholder={t("search-chapters")}
            prefix={<SearchOutlined aria-hidden />}
            value={chapterQuery}
            onChange={(e) => setChapterQuery(e.target.value)}
          />
        </div>
        <nav aria-label={t("chapters")}>
          {filteredChapters.length > 0 ? (
            <Menu
              selectedKeys={[`${currentChapter.id}`]}
              mode="inline"
              onClick={closeChaptersDrawer}
              items={filteredChapters.map((chapter) => ({
                key: `${chapter.id}`,
                className: "text-left",
                label: (
                  <Link href={chapterPath(chapter.id)}>
                    <Typography.Text className="capitalize">
                      {t("chapter-name", {
                        id: chapter.id,
                        name: chapter.name_simple,
                        translation: chapter.translated_name.name,
                      })}
                    </Typography.Text>
                  </Link>
                ),
              }))}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("no-chapters-found")} />
          )}
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
      <div className="fixed top-16 shadow-md bg-surface border-t border-line w-full z-10">
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
              ellipsis={{ tooltip: chapterTitle }}
              className="capitalize text-lg m-0"
              style={{ fontWeight: responsive.md ? 600 : 400 }}
            >
              {chapterTitle}
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
        {notice && <Col span={22}>{notice}</Col>}
        <Col span={22}>
          <ChapterHeader chapter={currentChapter} />
        </Col>
        <Col span={24}>
          <Virtuoso
            data={verseList}
            useWindowScroll
            ref={virtualListRef}
            itemContent={(i, item) => (
              <Row justify="center">
                <Col span={22} className="py-2">
                  <Verse
                    verseNumber={i + 1}
                    chapterNumber={chapterNumber}
                    chapterName={currentChapter.name_simple}
                    faved={faves.includes(verseKey(chapterNumber, i + 1))}
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
                    highlighted={highlightedVerse === i + 1}
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
            onVerseChange={setRecitingVerse}
          />
        )}
      </Drawer>
    </>
  );
};

export default Chapter;
