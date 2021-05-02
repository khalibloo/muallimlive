import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

interface GetVersesUthmaniSimpleResponse {
  verses: VerseUthmaniSimple[];
}
const getVersesUthmaniSimple = async (chapterNumber?: number) => {
  const { data } = await axios.get("/quran/verses/uthmani_simple", {
    params: { chapter_number: chapterNumber },
  });
  return data;
};

export default function useVersesUthmaniSimple(
  chapterNumber?: number,
  options?: QueryOptions<GetVersesUthmaniSimpleResponse, Error>,
) {
  return useQuery<GetVersesUthmaniSimpleResponse, Error>(
    ["verses-uthmani-simple", { chapterNumber }],
    () => getVersesUthmaniSimple(chapterNumber),
    options,
  );
}
