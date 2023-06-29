import { Metadata, NextPage } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import config from "@/utils/config";
import { fetchData } from "@/utils/fetcher";
import Chapter from "./Chapter";

interface Props {
  params: { id: string };
}

const fetchChapters = () => fetchData<GetChaptersResponse>("resources/chapters");

export async function generateMetadata({ params: { id } }: Props): Promise<Metadata> {
  const chaptersData = await fetchChapters();
  const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);

  return {
    title: `${chapter?.name_simple} | Muallimlive`,
    description: `Chapter ${id} of the Holy Qur'an`,
  };
}

const ChapterPage: NextPage<Props> = async ({ params: { id } }) => {
  const chaptersData = await fetchChapters();
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
        fetchData<GetVersesTranslationResponse>(`chapters/${chapter.id}/translations/${translationId}`)
      )
  );

  const tafsirContentData = await Promise.all(
    tafsirContentTypes
      .map((c) => (c.content as number[])[2])
      .map((tafsirId) => fetchData<GetVersesTafsirResponse>(`chapters/${chapter.id}/tafsirs/${tafsirId}`))
  );

  const mapContent = (c: ReaderSettings["left"][0]): VerseText[] => {
    if (c.content?.[0] === "translation") {
      if (c.content[1] === "ar") {
        const i = arabicContentTypes.findIndex((t) => t.content?.[2] === c.content?.[2]);
        return arabicContentData[i].verses;
      }
      const index = translationContentTypes.findIndex((t) => t.content?.[2] === c.content?.[2]);
      return translationContentData[index].translations.map((t, i) => ({
        id: i + 1,
        text: t.text,
        verse_key: `${chapter.id}:${i + 1}`,
      }));
    }
    // then it's a tafsir
    // if (c.content?.[0] === "tafsir") {
    const index = tafsirContentTypes.findIndex((t) => t.content?.[2] === c.content?.[2]);
    // some verses are skipped in tafsirs, we should fill in the blanks
    const tafsirs: VerseText[] = [];
    for (let i = 0; i < chapter.verses_count; i++) {
      const tafsir = tafsirContentData[index].tafsirs.find((t) => t.verse_id === i + 1);
      tafsirs.push(
        tafsir
          ? {
              id: tafsir.verse_id,
              verse_key: `${chapter.id}:${i + 1}`,
              text: tafsir.text,
              isHTML: true,
              isTafsir: true,
            }
          : { id: i + 1, text: "", verse_key: `${chapter.id}:${i + 1}` }
      );
    }
    return tafsirs;
    // }
  };

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
      leftContent={readerSettings.left.map(mapContent)}
      rightContent={readerSettings.right.map(mapContent)}
      versesRecitations={versesRecitationsData.audio_files}
      recitations={recitations}
      playerSettings={playerSettings}
    />
  );
};

export default ChapterPage;
