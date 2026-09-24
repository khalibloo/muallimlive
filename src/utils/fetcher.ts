import config from "./config";

export const fetchData = async <T>(url: string): Promise<T> => {
  // Qur'an data is static, so keep Next 13's default of caching fetches (Next 15+ no longer caches by default)
  const res = await fetch(`${config.apiUri}/data/${url}.json`, { cache: "force-cache" });

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  return res.json();
};
