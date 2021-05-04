import { useQuery, UseQueryOptions } from "react-query";
import axios from "@/utils/request";

interface GetVersesTafsirResponse {
  tafsirs: VerseText[];
}
const getVersesTafsir = async (tafsirId: number, chapterNumber?: number) => {
  const { data } = await axios.get(`/quran/tafsirs/${tafsirId}`, {
    params: { chapter_number: chapterNumber },
  });
  return data;
};

export default function useVersesTafsir(
  tafsirId: number,
  chapterNumber?: number,
  options?: UseQueryOptions<GetVersesTafsirResponse, Error>,
) {
  return useQuery<GetVersesTafsirResponse, Error>(
    ["verses-tafsir", { tafsirId, chapterNumber }],
    () => getVersesTafsir(tafsirId, chapterNumber),
    options,
  );
}
