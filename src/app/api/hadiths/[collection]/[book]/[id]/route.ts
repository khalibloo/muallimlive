import { notFound } from "next/navigation";

import { CACHE_HEADERS } from "@/utils/content";
import { findBook, getHadith } from "@/utils/hadiths";

export async function GET(_req: Request, ctx: RouteContext<"/api/hadiths/[collection]/[book]/[id]">) {
  const { collection, book, id } = await ctx.params;
  const found = await findBook(collection, book);
  if (!found?.book.hadiths.includes(id)) {
    notFound();
  }
  return Response.json(await getHadith(collection, found.book.id, id), { headers: CACHE_HEADERS });
}
