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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: Infinity,
      staleTime: config.staleTime, // 1 month
    },
  },
});

export default axios.create({
  baseURL: config.apiUri,
  headers: {
    "Content-Type": "application/json",
  },
});
