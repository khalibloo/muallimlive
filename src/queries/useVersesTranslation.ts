import { useQueries, UseQueryOptions, UseQueryResult } from "react-query";
import axios from "@/utils/request";

interface GetVersesTranslationResponse {
  translations: { resource_id: number; text: string }[];
}
const getVersesTranslation = async (
  translationId: number,
  chapterNumber?: number,
) => {
  const { data } = await axios.get<GetVersesTranslationResponse>(
    `/quran/translations/${translationId}`,
    {
      params: { chapter_number: chapterNumber },
    },
  );
  return data.translations.map((t) => ({
    id: t.resource_id,
    isBold: true,
    text: t.text,
  }));
};

const useVersesTranslation = (
  translationIds: number[],
  chapterNumber?: number,
  options?: UseQueryOptions,
) => {
  return useQueries(
    translationIds.map((translationId) => ({
      queryKey: ["verses-translation", { translationId, chapterNumber }],
      queryFn: () => getVersesTranslation(translationId, chapterNumber),
      ...options,
    })),
  ) as UseQueryResult<VerseText[], Error>[];
};

export default useVersesTranslation;
