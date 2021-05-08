import React, { useState } from "react";
import { NextPage } from "next";
import {
  BackTop,
  Button,
  Col,
  Drawer,
  List,
  Menu,
  Row,
  Tooltip,
  Typography,
} from "antd";
import { useBoolean, useResponsive } from "ahooks";
import clx from "classnames";
import { useRouter } from "next/router";
import Link from "next/link";
import _ from "lodash";
import lf from "@/utils/localforage";

import BasicLayout from "@/layouts/BasicLayout";
import Loader from "@/components/Loader";

import { MenuOutlined } from "@ant-design/icons";
import useChapters from "@/queries/useChapters";
import useVersesArabic from "@/queries/useVersesArabic";
import useVersesTranslation from "@/queries/useVersesTranslation";
import useVersesTafsir from "@/queries/useVersesTafsir";
import Verse from "@/components/Verse";
import Fave from "@/components/Fave";
import config from "@/utils/config";
import Notes from "@/components/Notes";

interface Props {}

const ChapterPage: NextPage<Props> = () => {
  const responsive = useResponsive();
  const {
    query: { id },
  } = useRouter();
  const chapterNumber = parseInt(id, 10);
  const [
    chaptersDrawerOpen,
    { setTrue: openChaptersDrawer, setFalse: closeChaptersDrawer },
  ] = useBoolean(false);

  const [settings, setSettings] = useState<ReaderSettings>();
  const [faves, setFaves] = useState<string[]>([]);

  React.useEffect(() => {
    const defaultSettings = config.defaultReaderSettings;
    lf.ready().then(() => {
      lf.getItem("reader-settings").then((settings) => {
        // TODO: validate object somehow
        setSettings((settings as ReaderSettings) || defaultSettings);
      });

      // sync localforage across tabs
      lf.configObservables({
        crossTabNotification: true,
        crossTabChangeDetection: true,
      });
      const ob = lf.newObservable({
        key: "reader-settings",
        crossTabNotification: true,
      });

      ob.subscribe({
        next: (args) => {
          setSettings(args.newValue || defaultSettings);
        },
      });
    });
  }, []);

  // resources
  const { data: chaptersData, isLoading: chaptersLoading } = useChapters();

  const currentChapter: Chapter = chaptersData?.chapters.find(
    (c) => c.id === chapterNumber,
  ) as Chapter;

  const contentTypes = settings ? [...settings.left, ...settings.right] : [];
  const arabicContentTypes = contentTypes.filter(
    (c) => c.content?.[0] === "translation" && c.content[1] === "ar",
  );
  const translationContentTypes = contentTypes.filter(
    (c) => c.content?.[0] === "translation" && c.content[1] !== "ar",
  );
  const tafsirContentTypes = contentTypes.filter(
    (c) => c.content?.[0] === "tafsir",
  );

  // data
  const arabicScriptsResults = useVersesArabic(
    arabicContentTypes.map((c) => (c.content as ArabicScript[])[2]),
    chapterNumber,
    { enabled: settings != null },
  );
  const translationResults = useVersesTranslation(
    translationContentTypes.map((c) => (c.content as number[])[2]),
    chapterNumber,
    { enabled: settings != null },
  );
  const tafsirResults = useVersesTafsir(
    tafsirContentTypes.map((c) => (c.content as number[])[2]),
    chapterNumber,
    { enabled: settings != null },
  );

  const isFinishedLoading = !(
    settings == null ||
    arabicScriptsResults.some((r) => r.isLoading) ||
    translationResults.some((r) => r.isLoading) ||
    tafsirResults.some((r) => r.isLoading) ||
    chaptersLoading
  );

  React.useEffect(() => {
    lf.ready().then(() => {
      lf.getItem("faves-quran").then((favesData) => {
        if (typeof favesData?.length === "number") {
          const surahFaves = favesData.filter((f) =>
            f.startsWith(`${chapterNumber}:`),
          );
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
          const surahFaves = args.newValue.filter((f) =>
            f.startsWith(`${chapterNumber}:`),
          );
          setFaves(surahFaves);
        },
      });
    });
  }, [chapterNumber]);

  // restore progress
  React.useEffect(() => {
    if (currentChapter && isFinishedLoading) {
      const key = `progress-surah-${chapterNumber}`;
      lf.ready().then(() => {
        lf.getItem(key).then((progress) => {
          // validation
          if (
            typeof progress === "number" &&
            progress > 0 &&
            progress <= currentChapter.verses_count
          ) {
            const v = document.getElementById(`v-${progress}`);
            if (v) {
              v.scrollIntoView({ behavior: "smooth" });
            }
          }
        });
      });
    }
  }, [currentChapter, isFinishedLoading]);

  if (!isFinishedLoading) {
    return (
      <BasicLayout pageTitle={currentChapter?.name_simple}>
        <Loader showRandomMessage />
      </BasicLayout>
    );
  }

  const mapContent = (c) => {
    if (c.content?.[0] === "translation" && c.content[1] === "ar") {
      const i = arabicContentTypes.findIndex(
        (t) => t.content?.[2] === c.content?.[2],
      );
      return arabicScriptsResults[i];
    } else if (c.content?.[0] === "translation" && c.content[1] !== "ar") {
      const i = translationContentTypes.findIndex(
        (t) => t.content?.[2] === c.content?.[2],
      );
      return translationResults[i];
    } else if (c.content?.[0] === "tafsir") {
      const i = tafsirContentTypes.findIndex(
        (t) => t.content?.[2] === c.content?.[2],
      );
      return tafsirResults[i];
    }
    return null;
  };
  const leftContent = settings ? settings.left.map(mapContent) : [];
  const rightContent = settings ? settings.right.map(mapContent) : [];

  const verseList: { left: VerseText[]; right: VerseText[] }[] = [];
  _.range(currentChapter.verses_count).forEach((i) => {
    const l = leftContent.map((c) => c?.data?.[i]);
    const r = rightContent.map((c) => c?.data?.[i]);
    if (![...l, ...r].includes(undefined)) {
      verseList.push({ left: l as VerseText[], right: r as VerseText[] });
    }
  });

  return (
    <BasicLayout noPadding pageTitle={currentChapter.name_simple}>
      <BackTop />
      <Drawer
        placement="left"
        closable={false}
        bodyStyle={{ padding: 0 }}
        onClose={closeChaptersDrawer}
        visible={chaptersDrawerOpen}
      >
        <Menu theme="dark" selectedKeys={[id]} mode="inline">
          {chaptersData?.chapters.map((chapter) => (
            <Menu.Item
              key={chapter.id}
              style={{ textAlign: "left" }}
              onClick={() => closeChaptersDrawer()}
            >
              <Link href={`/chapters/${chapter.id}`}>
                <a>
                  <Tooltip
                    overlayClassName="capitalize"
                    title={chapter.translated_name.name}
                    placement="right"
                  >
                    <Typography.Text className="capitalize">
                      <span className="mr-3">{chapter.id}</span>
                      {chapter.name_simple}
                    </Typography.Text>
                  </Tooltip>
                </a>
              </Link>
            </Menu.Item>
          ))}
        </Menu>
      </Drawer>
      <div className="fixed shadow-md bg-444 w-full z-10">
        <div className="flex items-stretch">
          <div>
            <Button
              className={clx("h-full border-none rounded-none", {
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
              {currentChapter.name_simple} -{" "}
              {currentChapter.translated_name.name}
            </Typography.Text>
          </div>
        </div>
      </div>
      <Row className="mt-13 py-6" justify="center">
        <Col span={22}>
          <List
            itemLayout="vertical"
            dataSource={verseList}
            renderItem={(item, i) => (
              <List.Item
                key={[...item.left, ...item.right]?.[0]?.[0]?.id}
                actions={[
                  <Fave
                    faved={faves.includes(`${chapterNumber}:${i + 1}`)}
                    chapterNumber={chapterNumber}
                    verseNumber={i + 1}
                  />,
                  <Notes chapterNumber={chapterNumber} verseNumber={i + 1} />,
                ]}
              >
                <div className="w-full">
                  <Verse
                    verseNumber={i + 1}
                    chapterNumber={chapterNumber}
                    totalVerses={currentChapter.verses_count}
                    left={item.left}
                    right={item.right}
                  />
                </div>
              </List.Item>
            )}
          />
        </Col>
      </Row>
    </BasicLayout>
  );
};

export default ChapterPage;
