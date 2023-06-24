import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "@/utils/request";

interface GetTranslationsResponse {
  translations: Translation[];
}
const getTranslations = async () => {
  const { data } = await axios.get("/resources/translations", {
    params: { language: "en" },
  });
  return data;
};

export default function useTranslations(options?: UseQueryOptions<GetTranslationsResponse, Error>) {
  return useQuery<GetTranslationsResponse, Error>(["translations", { language: "en" }], getTranslations, options);
}
