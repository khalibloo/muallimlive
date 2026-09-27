import { CACHE_HEADERS } from "@/utils/content";
import { getHadithResources } from "@/utils/hadiths";

// The offline pages and the search filters need the collections and books; the service worker precaches it
export async function GET() {
  return Response.json(await getHadithResources(), { headers: CACHE_HEADERS });
}
