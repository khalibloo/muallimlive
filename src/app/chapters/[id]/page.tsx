import { Metadata, NextPage } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import config from "@/utils/config";
import { fetchData } from "@/utils/fetcher";
import { parsePlaySettings, parseReaderSettings, PLAYER_SETTINGS_KEY, READER_SETTINGS_KEY } from "@/utils/cookies";
import Chapter from "./Chapter";

interface Props {
  params: Promise<{ id: string }>;
}

const fetchChapters = () => fetchData<GetChaptersResponse>("resources/chapters");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const chaptersData = await fetchChapters();
  const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);
  if (!chapter) {
    return {};
  }

  return {
    title: chapter.name_simple,
    description: `Chapter ${id} of the Holy Qur'an`,
  };
}

const ChapterPage: NextPage<Props> = async ({ params }) => {
  const { id } = await params;
  const chaptersData = await fetchChapters();
  const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);
  if (!chapter) {
    notFound();
  }

  const cookieStore = await cookies();
  const readerSettings = parseReaderSettings(cookieStore.get(READER_SETTINGS_KEY)?.value);
  const playerSettings = parsePlaySettings(cookieStore.get(PLAYER_SETTINGS_KEY)?.value);

  const contentTypes = [...readerSettings.left, ...readerSettings.right];
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
              }) as VerseText,
          ),
        })),
      ),
  );

  const translationContentData = await Promise.all(
    translationContentTypes
      .map((c) => (c.content as number[])[2])
      .map((translationId) =>
        fetchData<GetVersesTranslationResponse>(`chapters/${chapter.id}/translations/${translationId}`),
      ),
  );

  const tafsirContentData = await Promise.all(
    tafsirContentTypes
      .map((c) => (c.content as number[])[2])
      .map((tafsirId) => fetchData<GetVersesTafsirResponse>(`chapters/${chapter.id}/tafsirs/${tafsirId}`)),
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
          : { id: i + 1, text: "", verse_key: `${chapter.id}:${i + 1}` },
      );
    }
    return tafsirs;
  };

  const [versesRecitationsData, recitations] = await Promise.all([
    fetchData<GetVersesRecitationResponse>(`chapters/${chapter.id}/recitations/${playerSettings.reciter}`).then(
      (data) => ({
        ...data,
        audio_files: data.audio_files.map((v) => {
          const url = new URL(config.apiMediaUri!);
          url.pathname = v.url;
          return {
            ...v,
            url: url.href,
          };
        }),
      }),
    ),
    fetchData<GetRecitationsResponse>("resources/recitations"),
  ]);

  return (
    <Chapter
      key={chapter.id}
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
