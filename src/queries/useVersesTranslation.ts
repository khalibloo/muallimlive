import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";

interface GetVersesTranslationResponse {
  translations: VerseText[];
}
const getVersesTranslation = async (
  translationId: number,
  chapterNumber?: number,
) => {
  const { data } = await axios.get(`/quran/translations/${translationId}`, {
    params: { chapter_number: chapterNumber },
  });
  return data;
};

export default function useVersesTranslation(
  translationId: number,
  chapterNumber?: number,
  options?: QueryOptions<GetVersesTranslationResponse, Error>,
) {
  return useQuery<GetVersesTranslationResponse, Error>(
    ["verses-translation", { translationId, chapterNumber }],
    () => getVersesTranslation(translationId, chapterNumber),
    options,
  );
}
