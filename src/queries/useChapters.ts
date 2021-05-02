import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

interface GetChaptersResponse {
  chapters: Chapter[];
}
const getChapters = async () => {
  const { data } = await axios.get("/chapters", {
    params: { language: "en" },
  });
  return data;
};

export default function useChapters(
  options?: QueryOptions<GetChaptersResponse, Error>,
) {
  return useQuery<GetChaptersResponse, Error>(
    ["chapters", { language: "en" }],
    getChapters,
    options,
  );
}
