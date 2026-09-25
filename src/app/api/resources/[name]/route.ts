import { notFound } from "next/navigation";

import { CACHE_HEADERS } from "@/utils/content";
import { fetchData } from "@/utils/fetcher";

// Only what the offline page needs; the service worker precaches these
const RESOURCES = ["chapters", "recitations"];

export async function GET(_req: Request, ctx: RouteContext<"/api/resources/[name]">) {
  const { name } = await ctx.params;
  if (!RESOURCES.includes(name)) {
    notFound();
  }
  return Response.json(await fetchData(`resources/${name}`), { headers: CACHE_HEADERS });
}
