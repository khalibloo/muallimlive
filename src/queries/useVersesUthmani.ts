import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

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
  options?: QueryOptions<GetVersesUthmaniResponse, Error>,
) {
  return useQuery<GetVersesUthmaniResponse, Error>(
    ["verses-uthmani", { chapterNumber }],
    () => getVersesUthmani(chapterNumber),
    options,
  );
}
