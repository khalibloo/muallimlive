import { QueryOptions, useQuery } from "react-query";
import axios from "@/utils/request";
import config from "@/utils/config";

interface GetRecitationsResponse {
  recitations: Recitation[];
}
const getRecitations = async () => {
  const { data } = await axios.get("/resources/recitations", {
    params: { language: "en" },
  });
  return data;
};

export default function useRecitations(
  options?: QueryOptions<GetRecitationsResponse, Error>,
) {
  return useQuery<GetRecitationsResponse, Error>(
    ["recitations", { language: "en" }],
    getRecitations,
    options,
  );
}
