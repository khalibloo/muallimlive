"use client";

import { useSyncExternalStore } from "react";
import { Alert, Button, Col, Row, Spin, Typography } from "antd";
import { useCookieState, useRequest } from "ahooks";
import { useTranslations } from "next-intl";

import { parsePlaySettings, parseReaderSettings, PLAYER_SETTINGS_KEY, READER_SETTINGS_KEY } from "@/utils/cookies";
import { fromPack, getNeighbors, packBooks, toBookIndex } from "@/utils/hadithPack";
import { readHadiths } from "@/utils/offline";
import { contentUrl, getContentPack, getJson, recitationUrl, resourceUrl } from "@/utils/packs";
import Chapter from "../chapters/[id]/Chapter";
import Book from "../hadiths/[collection]/[book]/Book";
import HadithView from "../hadiths/[collection]/[book]/[id]/HadithView";
import Collection from "../hadiths/[collection]/Collection";
import Hadiths from "../hadiths/Hadiths";
import Home from "../Home";
import Saved from "../saved/Saved";

const Unavailable: React.FC<{ message?: string }> = ({ message }) => {
  const t = useTranslations("common");
  return (
    <Row justify="center">
      <Col md={16}>
        <Typography.Title level={1}>{t("offline-heading")}</Typography.Title>
        <Typography.Paragraph>{message ?? t("offline-message")}</Typography.Paragraph>
        <Row justify="space-around" align="middle" className="mt-12">
          <Button type="primary" href="/">
            {t("go-home")}
          </Button>
        </Row>
      </Col>
    </Row>
  );
};

const OfflineChapter: React.FC<{ id: number }> = ({ id }) => {
  const t = useTranslations("common");
  const [readerSettingsCookie] = useCookieState(READER_SETTINGS_KEY);
  const [playerSettingsCookie] = useCookieState(PLAYER_SETTINGS_KEY);
  const readerSettings = parseReaderSettings(readerSettingsCookie);
  const playerSettings = parsePlaySettings(playerSettingsCookie);

  const { data, loading } = useRequest(async () => {
    const getContent = (items: VerseLayoutItem[]) =>
      Promise.all(
        items.map((item) => {
          const pack = getContentPack(item);
          return pack ? getJson<VerseText[]>(contentUrl(pack, id)) : [];
        }),
      );
    const [chapters, recitations, leftContent, rightContent, versesRecitations] = await Promise.all([
      getJson<GetChaptersResponse>(resourceUrl("chapters")),
      getJson<GetRecitationsResponse>(resourceUrl("recitations")),
      getContent(readerSettings.left),
      getContent(readerSettings.right),
      getJson<VerseRecitation[]>(recitationUrl(playerSettings.reciter, id)),
    ]);
    return { chapters, recitations, leftContent, rightContent, versesRecitations };
  });

  if (loading) {
    return <Spin className="mt-12" />;
  }
  const chapter = data?.chapters?.chapters.find((c) => c.id === id);
  if (!data?.chapters || !data.recitations || !chapter) {
    return <Unavailable />;
  }

  const { leftContent, rightContent } = data;
  const missingContent = [...leftContent, ...rightContent].some((c) => !c);
  return (
    <Chapter
      chapter={chapter}
      chapters={data.chapters}
      leftContent={leftContent.map((c) => c ?? [])}
      rightContent={rightContent.map((c) => c ?? [])}
      readerSettings={readerSettings}
      versesRecitations={data.versesRecitations ?? []}
      recitations={data.recitations}
      playerSettings={playerSettings}
      notice={missingContent && <Alert type="warning" showIcon title={t("offline-content-missing")} />}
    />
  );
};

const OfflineHome: React.FC = () => {
  const { data: chapters, loading } = useRequest(() => getJson<GetChaptersResponse>(resourceUrl("chapters")));

  if (loading) {
    return <Spin className="mt-12" />;
  }
  if (!chapters) {
    return <Unavailable />;
  }
  return <Home chapters={chapters.chapters} />;
};

const OfflineSaved: React.FC = () => {
  const [readerSettingsCookie] = useCookieState(READER_SETTINGS_KEY);
  const { data, loading } = useRequest(async () => {
    const [chapters, hadiths] = await Promise.all([
      getJson<GetChaptersResponse>(resourceUrl("chapters")),
      getJson<GetHadithResourcesResponse>(resourceUrl("hadiths")),
    ]);
    return { chapters, hadiths };
  });

  if (loading) {
    return <Spin className="mt-12" />;
  }
  if (!data?.chapters) {
    return <Unavailable />;
  }
  return (
    <Saved
      chapters={data.chapters.chapters}
      readerSettings={parseReaderSettings(readerSettingsCookie)}
      hadiths={data.hadiths ?? { collections: [] }}
    />
  );
};

const HADITH_PATH = /^\/hadiths(?:\/([a-z-]+)(?:\/(\d+)(?:\/([\w.]+))?)?)?$/;

const OfflineHadiths: React.FC<{ collectionId?: string; bookId?: number; id?: string }> = ({
  collectionId,
  bookId,
  id,
}) => {
  const t = useTranslations("common");
  const { data, loading } = useRequest(async () => {
    const resources = await getJson<GetHadithResourcesResponse>(resourceUrl("hadiths"));
    const needsPack = bookId !== undefined && resources?.collections.some((c) => c.id === collectionId);
    const pack = needsPack ? await readHadiths(collectionId!).catch(() => undefined) : undefined;
    return { resources, pack };
  });

  if (loading) {
    return <Spin className="mt-12" />;
  }
  const collection = data?.resources?.collections.find((c) => c.id === collectionId);
  if (!data?.resources || (collectionId && !collection)) {
    return <Unavailable />;
  }
  if (!collection) {
    return <Hadiths collections={data.resources.collections} />;
  }
  if (bookId === undefined) {
    return <Collection collection={collection} />;
  }
  const book = collection.books.find((b) => b.id === bookId);
  if (!book) {
    return <Unavailable />;
  }
  if (!data.pack) {
    return <Unavailable message={t("hadith-collection-missing")} />;
  }
  if (id === undefined) {
    return <Book collection={collection} book={book} hadiths={toBookIndex(data.pack.hadiths, bookId)} />;
  }
  const hadith = data.pack.hadiths.find((h) => h.book === bookId && h.id === id);
  if (!hadith) {
    return <Unavailable />;
  }
  return <HadithView hadith={fromPack(collection, hadith)} {...getNeighbors(packBooks(data.pack), bookId, id)} />;
};

// The page is served in place of whichever page failed to load, so the URL is the page to show
const subscribe = () => () => {};

const OfflinePage: React.FC = () => {
  const pathname = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => undefined,
  );
  if (pathname === undefined) {
    return null;
  }
  const chapterId = pathname.match(/^\/chapters\/(\d+)$/)?.[1];
  if (chapterId) {
    return <OfflineChapter key={chapterId} id={Number(chapterId)} />;
  }
  if (pathname === "/") {
    return <OfflineHome />;
  }
  if (pathname === "/saved") {
    return <OfflineSaved />;
  }
  const hadithMatch = pathname.match(HADITH_PATH);
  if (hadithMatch) {
    const [, collectionId, bookId, id] = hadithMatch;
    return (
      <OfflineHadiths
        key={pathname}
        collectionId={collectionId}
        bookId={bookId === undefined ? undefined : Number(bookId)}
        id={id && decodeURIComponent(id)}
      />
    );
  }
  return <Unavailable />;
};

export default OfflinePage;
