import config from "./config";

export const fetchData = async <T>(url: string): Promise<T> => {
  const res = await fetch(`${config.apiUri}/data/${url}.json`);

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  return res.json();
};
