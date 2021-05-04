import { useQuery, UseQueryOptions } from "react-query";
import axios from "@/utils/request";

interface GetVersesUthmaniTajweedResponse {
  verses: VerseUthmaniTajweed[];
}
const getVersesUthmaniTajweed = async (chapterNumber?: number) => {
  const { data } = await axios.get("/quran/verses/uthmani_tajweed", {
    params: { chapter_number: chapterNumber },
  });
  return data;
};

export default function useVersesUthmaniTajweed(
  chapterNumber?: number,
  options?: UseQueryOptions<GetVersesUthmaniTajweedResponse, Error>,
) {
  return useQuery<GetVersesUthmaniTajweedResponse, Error>(
    ["verses-uthmani-tajweed", { chapterNumber }],
    () => getVersesUthmaniTajweed(chapterNumber),
    options,
  );
}
