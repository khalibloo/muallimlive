import { useQuery, UseQueryOptions } from "react-query";
import axios from "@/utils/request";

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
  options?: UseQueryOptions<GetRecitationsResponse, Error>,
) {
  return useQuery<GetRecitationsResponse, Error>(
    ["recitations", { language: "en" }],
    getRecitations,
    options,
  );
}
