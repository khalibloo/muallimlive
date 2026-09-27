import { hadithPackUrl, SYNONYMS_URL, TEXT_CACHE } from "./packs";

// Reads the downloaded hadith packs back from Cache Storage. Kept apart from offline.ts, which the hadith
// search worker would otherwise bundle along with React.

export const readHadiths = async (collection: string): Promise<HadithPack> => {
  const response = await (await caches.open(TEXT_CACHE)).match(hadithPackUrl(collection));
  if (!response) {
    throw new Error(`${collection} isn't downloaded`);
  }
  return response.json();
};

export const readSynonyms = async (): Promise<HadithSynonyms> => {
  const response = await (await caches.open(TEXT_CACHE)).match(SYNONYMS_URL);
  return response ? response.json() : { groups: [] };
};
