import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "@/utils/request";

interface GetLanguagesResponse {
  languages: Language[];
}
const getLanguages = async () => {
  const { data } = await axios.get("/resources/languages", {
    params: { language: "en" },
  });
  return data;
};

export default function useLanguages(options?: UseQueryOptions<GetLanguagesResponse, Error>) {
  return useQuery<GetLanguagesResponse, Error>(["languages", { language: "en" }], getLanguages, options);
}
