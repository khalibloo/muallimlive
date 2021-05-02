import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

interface GetVersesImlaeiSimpleResponse {
  verses: VerseImlaeiSimple[];
}
const getVersesImlaeiSimple = async (chapterNumber?: number) => {
  const { data } = await axios.get("/quran/verses/imlaei_simple", {
    params: { chapter_number: chapterNumber },
  });
  return data;
};

export default function useVersesImlaeiSimple(
  chapterNumber?: number,
  options?: QueryOptions<GetVersesImlaeiSimpleResponse, Error>,
) {
  return useQuery<GetVersesImlaeiSimpleResponse, Error>(
    ["verses-imlaei-simple", { chapterNumber }],
    () => getVersesImlaeiSimple(chapterNumber),
    options,
  );
}
