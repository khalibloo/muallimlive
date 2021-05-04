import { useQuery, UseQueryOptions } from "react-query";
import axios from "@/utils/request";

interface GetVersesUthmaniResponse {
  verses: VerseUthmani[];
}
const getVersesUthmani = async (chapterNumber?: number) => {
  const { data } = await axios.get("/quran/verses/uthmani", {
    params: { chapter_number: chapterNumber },
  });
  return data;
};

export default function useVersesUthmani(
  chapterNumber?: number,
  options?: UseQueryOptions<GetVersesUthmaniResponse, Error>,
) {
  return useQuery<GetVersesUthmaniResponse, Error>(
    ["verses-uthmani", { chapterNumber }],
    () => getVersesUthmani(chapterNumber),
    options,
  );
}
