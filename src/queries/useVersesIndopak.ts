import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

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
  options?: QueryOptions<GetVersesIndopakResponse, Error>,
) {
  return useQuery<GetVersesIndopakResponse, Error>(
    ["verses-indopak", { chapterNumber }],
    () => getVersesIndopak(chapterNumber),
    options,
  );
}
