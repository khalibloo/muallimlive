import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

interface GetVersesImlaeiResponse {
  verses: VerseImlaei[];
}
const getVersesImlaei = async (chapterNumber?: number) => {
  const { data } = await axios.get("/quran/verses/imlaei", {
    params: { chapter_number: chapterNumber },
  });
  return data;
};

export default function useVersesImlaei(
  chapterNumber?: number,
  options?: QueryOptions<GetVersesImlaeiResponse, Error>,
) {
  return useQuery<GetVersesImlaeiResponse, Error>(
    ["verses-imlaei", { chapterNumber }],
    () => getVersesImlaei(chapterNumber),
    options,
  );
}
