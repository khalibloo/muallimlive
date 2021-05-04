import { useQuery, UseQueryOptions } from "react-query";
import axios from "@/utils/request";

interface GetVersesIndopakResponse {
  verses: VerseIndopak[];
}
const getVersesIndopak = async (chapterNumber?: number) => {
  const { data } = await axios.get("/quran/verses/indopak", {
    params: { chapter_number: chapterNumber },
  });
  return data;
};

export default function useVersesIndopak(
  chapterNumber?: number,
  options?: UseQueryOptions<GetVersesIndopakResponse, Error>,
) {
  return useQuery<GetVersesIndopakResponse, Error>(
    ["verses-indopak", { chapterNumber }],
    () => getVersesIndopak(chapterNumber),
    options,
  );
}
