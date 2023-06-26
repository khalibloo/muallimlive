import { Metadata, NextPage } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import chaptersData from "@/data/resources/chapters.json";
import Chapter from "./Chapter";
import config from "@/utils/config";
import { fetchData } from "@/data/fetcher";

export const metadata: Metadata = {
  title: "Terms of Service | Muallimlive",
  description: "Muallimlive terms of service document.",
};

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params: { id } }: Props): Promise<Metadata> {
  const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);

  return {
    title: `${chapter?.name_simple} | Muallimlive`,
    description: `Chapter ${id} of the Holy Qur'an`,
  };
}

const ChapterPage: NextPage<Props> = async ({ params: { id } }) => {
  const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);
  if (!chapter) {
    notFound();
  }

  const cookieStore = cookies();
  const readerSettingsData = cookieStore.get("reader-settings");
  const readerSettings: ReaderSettings = readerSettingsData?.value
    ? JSON.parse(readerSettingsData.value)
    : config.defaultReaderSettings;
  const playerSettingsData = cookieStore.get("player-settings");
  const playerSettings: PlaySettings = playerSettingsData?.value
    ? JSON.parse(playerSettingsData.value)
    : config.defaultPlaySettings;

  const contentTypes = readerSettings ? [...readerSettings.left, ...readerSettings.right] : [];
  const arabicContentTypes = contentTypes.filter((c) => c.content?.[0] === "translation" && c.content[1] === "ar");
  const translationContentTypes = contentTypes.filter((c) => c.content?.[0] === "translation" && c.content[1] !== "ar");
  const tafsirContentTypes = contentTypes.filter((c) => c.content?.[0] === "tafsir");

  const arabicContentData = await Promise.all(
    arabicContentTypes
      .map((c) => (c.content as ArabicScript[])[2])
      .map((scriptName) =>
        fetchData<GetVersesArabicResponse>(`chapters/${chapter.id}/arabic/${scriptName}`).then((data) => ({
          ...data,
          verses: data.verses.map(
            (v: any) =>
              ({
                isArabic: true,
                isHTML: true,
                verse_key: v.verse_key as string,
                text: v[`text_${scriptName}`] as string,
              } as VerseText)
          ),
        }))
      )
  );

  const translationContentData = await Promise.all(
    translationContentTypes
      .map((c) => (c.content as number[])[2])
      .map((translationId) =>
        fetchData<GetTranslationsResponse>(`chapters/${chapter.id}/translations/${translationId}`)
      )
  );

  const tafsirContentData = await Promise.all(
    tafsirContentTypes
      .map((c) => (c.content as number[])[2])
      .map((tafsirId) => fetchData<GetTafsirsResponse>(`chapters/${chapter.id}/tafsirs/${tafsirId}`))
  );

  const mapContent = (c: ReaderSettings["left"][0]) => {
    if (c.content?.[0] === "translation" && c.content[1] === "ar") {
      const i = arabicContentTypes.findIndex((t) => t.content?.[2] === c.content?.[2]);
      return arabicContentData[i].verses;
    } else if (c.content?.[0] === "translation" && c.content[1] !== "ar") {
      const i = translationContentTypes.findIndex((t) => t.content?.[2] === c.content?.[2]);
      return translationContentData[i].translations;
    } else if (c.content?.[0] === "tafsir") {
      const i = tafsirContentTypes.findIndex((t) => t.content?.[2] === c.content?.[2]);
      return tafsirContentData[i].tafsirs;
    }
    return null;
  };
  const leftContent = readerSettings.left.map(mapContent);
  const rightContent = readerSettings.right.map(mapContent);

  const versesRecitationsData = await fetchData<GetVersesRecitationResponse>(
    `chapters/${chapter.id}/recitations/${playerSettings.reciter}`
  ).then((data) => ({
    ...data,
    audio_files: data.audio_files.map((v) => {
      const url = new URL(config.apiMediaUri!);
      url.pathname = v.url;
      return {
        ...v,
        url: url.href,
      };
    }),
  }));

  const recitations = await fetchData<GetRecitationsResponse>("resources/recitations");

  return (
    <Chapter
      chapter={chapter}
      chapters={chaptersData}
      leftContent={leftContent}
      rightContent={rightContent}
      versesRecitations={versesRecitationsData.audio_files}
      recitations={recitations}
      playerSettings={playerSettings}
    />
  );
};

export default ChapterPage;
