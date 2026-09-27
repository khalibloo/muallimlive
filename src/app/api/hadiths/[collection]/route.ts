import { notFound } from "next/navigation";

import { CACHE_HEADERS } from "@/utils/content";
import { getCollectionPack, getCollections } from "@/utils/hadiths";

export async function GET(_req: Request, ctx: RouteContext<"/api/hadiths/[collection]">) {
  const { collection } = await ctx.params;
  if (!(await getCollections()).collections.some((c) => c.id === collection)) {
    notFound();
  }
  return Response.json(await getCollectionPack(collection), { headers: CACHE_HEADERS });
}
