import { useQueries, UseQueryOptions, UseQueryResult } from "react-query";
import axios from "@/utils/request";

interface GetVersesArabicResponse {
  verses: (
    | VerseIndopak
    | VerseImlaei
    | VerseImlaeiSimple
    | VerseUthmani
    | VerseUthmaniSimple
    | VerseUthmaniTajweed
  )[];
}
const getVersesArabic = async (name: ArabicScript, chapterNumber?: number) => {
  const { data } = await axios.get<GetVersesArabicResponse>(
    `/quran/verses/${name}`,
    {
      params: { chapter_number: chapterNumber },
    },
  );
  return data.verses.map((v) => ({
    id: v.id,
    // isBold: true,
    isArabic: true,
    verse_key: v.verse_key,
    text: v[`text_${name}`],
  }));
};

export default function useVersesArabic(
  names: ArabicScript[],
  chapterNumber?: number,
  options?: UseQueryOptions,
) {
  return useQueries(
    names.map((name) => ({
      ...options,
      queryKey: ["verses-arabic", { name, chapterNumber }],
      queryFn: () => getVersesArabic(name, chapterNumber),
    })),
  ) as UseQueryResult<VerseText[], Error>[];
}
