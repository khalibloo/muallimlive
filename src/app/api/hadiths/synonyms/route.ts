import { CACHE_HEADERS } from "@/utils/content";
import { getSynonyms } from "@/utils/hadiths";

export async function GET() {
  return Response.json(await getSynonyms(), { headers: CACHE_HEADERS });
}
