import axios from "axios";
import { QueryClient } from "react-query";
import { setLogger } from "react-query";
import config from "./config";

if (config.env === "production") {
  setLogger({
    log: () => {},
    warn: () => {},
    error: () => {},
  });
}

export const queryClient = new QueryClient();

const key =
  typeof window !== "undefined" &&
  (localStorage.getItem("jwt") || sessionStorage.getItem("jwt"));
export default axios.create({
  baseURL: config.apiUri,
  headers: {
    "Content-Type": "application/json",
    Authorization: key ? `Token ${key}` : undefined,
  },
});
