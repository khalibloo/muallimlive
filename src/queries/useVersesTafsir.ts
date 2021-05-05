import { useQueries, UseQueryOptions, UseQueryResult } from "react-query";
import dompurify from "dompurify";

import axios from "@/utils/request";

interface GetVersesTafsirResponse {
  tafsirs: { resource_id: number; text: string }[];
}
const getVersesTafsir = async (tafsirId: number, chapterNumber?: number) => {
  const { data } = await axios.get<GetVersesTafsirResponse>(
    `/quran/tafsirs/${tafsirId}`,
    {
      params: { chapter_number: chapterNumber },
    },
  );
  return data.tafsirs.map((t) => ({
    id: t.resource_id,
    isHTML: true,
    text: dompurify.sanitize(t.text),
  }));
};

export default function useVersesTafsir(
  tafsirIds: number[],
  chapterNumber?: number,
  options?: UseQueryOptions,
) {
  return useQueries(
    tafsirIds.map((tafsirId) => ({
      queryKey: ["verses-tafsir", { tafsirId, chapterNumber }],
      queryFn: () => getVersesTafsir(tafsirId, chapterNumber),
      ...options,
    })),
  ) as UseQueryResult<VerseText[], Error>[];
}
