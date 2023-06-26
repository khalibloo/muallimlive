import { QueryClient } from "@tanstack/react-query";
import config from "./config";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: Infinity,
      staleTime: config.staleTime,
    },
  },
});
