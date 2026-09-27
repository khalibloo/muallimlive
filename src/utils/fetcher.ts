import config from "./config";

// Qur'an data is static, so keep Next 13's default of caching fetches (Next 15+ no longer caches by default)
export const fetchData = async <T>(url: string, init: RequestInit = { cache: "force-cache" }): Promise<T> => {
  const res = await fetch(`${config.apiUri}/data/${url}.json`, init);

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  return res.json();
};
