import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

interface GetVersesRecitationResponse {
  audio_files: VerseRecitation[];
}
const getVersesRecitation = async (recitationId: number, chapterNumber?: number) => {
  const { data } = await axios.get<GetVersesRecitationResponse>(`/quran/recitations/${recitationId}`, {
    params: { chapter_number: chapterNumber },
  });
  return data.audio_files.map((a) => {
    const url = new URL(config.apiMediaUri!);
    url.pathname = a.url;
    return { ...a, url: url.href };
  });
};

export default function useVersesRecitation(
  recitationId: number,
  chapterNumber?: number,
  options?: UseQueryOptions<VerseRecitation[], Error>
) {
  return useQuery<VerseRecitation[], Error>(
    ["verses-recitation", { recitationId, chapterNumber }],
    () => getVersesRecitation(recitationId, chapterNumber),
    options
  );
}
