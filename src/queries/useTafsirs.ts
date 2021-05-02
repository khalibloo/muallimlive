import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

interface GetTafsirsResponse {
  tafsirs: Tafsir[];
}
const getTafsirs = async () => {
  const { data } = await axios.get("/resources/tafsirs", {
    params: { language: "en" },
  });
  return data;
};

export default function useTafsirs(
  options?: QueryOptions<GetTafsirsResponse, Error>,
) {
  return useQuery<GetTafsirsResponse, Error>(
    ["tafsirs", { language: "en" }],
    getTafsirs,
    options,
  );
}
