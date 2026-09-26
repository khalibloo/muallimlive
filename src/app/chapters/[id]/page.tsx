import { Metadata, NextPage } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getChapters, getVerseRecitations, getVerseTexts } from "@/utils/content";
import { fetchData } from "@/utils/fetcher";
import { parsePlaySettings, parseReaderSettings, PLAYER_SETTINGS_KEY, READER_SETTINGS_KEY } from "@/utils/cookies";
import { getContentPack } from "@/utils/packs";
import Chapter from "./Chapter";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const chaptersData = await getChapters();
  const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);
  if (!chapter) {
    notFound();
  }

  const t = await getTranslations("common");
  return {
    title: chapter.name_simple,
    description: t("chapter-description", { id }),
  };
}

const ChapterPage: NextPage<Props> = async ({ params }) => {
  const { id } = await params;
  const chaptersData = await getChapters();
  const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);
  if (!chapter) {
    notFound();
  }

  const cookieStore = await cookies();
  const readerSettings = parseReaderSettings(cookieStore.get(READER_SETTINGS_KEY)?.value);
  const playerSettings = parsePlaySettings(cookieStore.get(PLAYER_SETTINGS_KEY)?.value);

  // fetchData dedupes repeated requests, so a content type shown twice is only fetched once
  const getContent = (items: VerseLayoutItem[]) =>
    Promise.all(
      items.map((item) => {
        const pack = getContentPack(item);
        return pack ? getVerseTexts(pack, chapter) : [];
      }),
    );

  const [leftContent, rightContent, versesRecitations, recitations] = await Promise.all([
    getContent(readerSettings.left),
    getContent(readerSettings.right),
    getVerseRecitations(playerSettings.reciter, chapter.id),
    fetchData<GetRecitationsResponse>("resources/recitations"),
  ]);

  return (
    <Chapter
      key={chapter.id}
      chapter={chapter}
      chapters={chaptersData}
      leftContent={leftContent}
      rightContent={rightContent}
      readerSettings={readerSettings}
      versesRecitations={versesRecitations}
      recitations={recitations}
      playerSettings={playerSettings}
    />
  );
};

export default ChapterPage;
