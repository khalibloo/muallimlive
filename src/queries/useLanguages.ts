import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

interface GetLanguagesResponse {
  languages: Language[];
}
const getLanguages = async () => {
  const { data } = await axios.get("/resources/languages", {
    params: { language: "en" },
  });
  return data;
};

export default function useLanguages(
  options?: QueryOptions<GetLanguagesResponse, Error>,
) {
  return useQuery<GetLanguagesResponse, Error>(
    ["languages", { language: "en" }],
    getLanguages,
    options,
  );
}
