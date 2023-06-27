import { headers } from "next/headers";

export const fetchData = async <T>(url: string): Promise<T> => {
  const origin = `${process.env.NODE_ENV === "development" ? "http" : "https"}://${headers().get("host")}`;
  const res = await fetch(`${origin}/data/${url}.json`);

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  return res.json();
};
