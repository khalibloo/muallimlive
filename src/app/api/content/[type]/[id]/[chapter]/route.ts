import { notFound } from "next/navigation";

import { CACHE_HEADERS, getChapters, getVerseRecitations, getVerseTexts } from "@/utils/content";
import { ARABIC_SCRIPTS } from "@/utils/packs";

/**
 * One chapter of a content pack (or a reciter's recitation files) for the offline downloads, so the
 * browser never talks to the data CDN directly
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/content/[type]/[id]/[chapter]">) {
  const { type, id, chapter: chapterId } = await ctx.params;
  const validId = type === "arabic" ? id in ARABIC_SCRIPTS : /^\d+$/.test(id);
  const chapter = (await getChapters()).chapters.find((c) => `${c.id}` === chapterId);
  if (!validId || !chapter) {
    notFound();
  }

  if (type === "recitation") {
    return Response.json(await getVerseRecitations(id, chapter.id), { headers: CACHE_HEADERS });
  }
  if (type === "arabic" || type === "translation" || type === "tafsir") {
    return Response.json(await getVerseTexts({ type, id }, chapter), { headers: CACHE_HEADERS });
  }
  notFound();
}
