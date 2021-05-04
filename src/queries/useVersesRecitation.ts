import { useQuery, UseQueryOptions } from "react-query";
import axios from "@/utils/request";

interface GetVersesRecitationResponse {
  audio_files: VerseRecitation[];
}
const getVersesRecitation = async (
  recitationId: number,
  chapterNumber?: number,
) => {
  const { data } = await axios.get(`/quran/recitations/${recitationId}`, {
    params: { chapter_number: chapterNumber },
  });
  return data;
};

export default function useVersesRecitation(
  recitationId: number,
  chapterNumber?: number,
  options?: UseQueryOptions<GetVersesRecitationResponse, Error>,
) {
  return useQuery<GetVersesRecitationResponse, Error>(
    ["verses-recitation", { recitationId, chapterNumber }],
    () => getVersesRecitation(recitationId, chapterNumber),
    options,
  );
}
