"use client";

import { useSyncExternalStore } from "react";
import { Alert, Button, Col, Row, Spin, Typography } from "antd";
import { useCookieState, useRequest } from "ahooks";
import { useTranslations } from "next-intl";

import { parsePlaySettings, parseReaderSettings, PLAYER_SETTINGS_KEY, READER_SETTINGS_KEY } from "@/utils/cookies";
import { contentUrl, getContentPack, getJson, recitationUrl, resourceUrl } from "@/utils/packs";
import Chapter from "../chapters/[id]/Chapter";
import Home from "../Home";
import Saved from "../saved/Saved";

const Unavailable: React.FC = () => {
  const t = useTranslations("common");
  return (
    <Row justify="center">
      <Col md={16}>
        <Typography.Title level={1}>{t("offline-heading")}</Typography.Title>
        <Typography.Paragraph>{t("offline-message")}</Typography.Paragraph>
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
  const { data: chapters, loading } = useRequest(() => getJson<GetChaptersResponse>(resourceUrl("chapters")));

  if (loading) {
    return <Spin className="mt-12" />;
  }
  if (!chapters) {
    return <Unavailable />;
  }
  return <Saved chapters={chapters.chapters} readerSettings={parseReaderSettings(readerSettingsCookie)} />;
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
  return <Unavailable />;
};

export default OfflinePage;
