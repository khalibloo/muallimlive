import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "@/utils/request";

interface GetChaptersResponse {
  chapters: Chapter[];
}
const getChapters = async () => {
  const { data } = await axios.get("/chapters", {
    params: { language: "en" },
  });
  return data;
};

export default function useChapters(options?: UseQueryOptions<GetChaptersResponse, Error>) {
  return useQuery<GetChaptersResponse, Error>(["chapters", { language: "en" }], getChapters, options);
}
