import "server-only";

import { fetchData } from "./fetcher";

export const getCollections = () => fetchData<GetHadithCollectionsResponse>("hadiths/collections");

export const getBooks = (collection: string) => fetchData<GetHadithBooksResponse>(`hadiths/${collection}/books`);

export const getBookIndex = (collection: string, book: number) =>
  fetchData<GetHadithBookIndexResponse>(`hadiths/${collection}/${book}/index`);

export const getHadith = (collection: string, book: number, id: string) =>
  fetchData<Hadith>(`hadiths/${collection}/${book}/${id}`);

// Next's data cache refuses responses over 2 MB, so the packs rely on the host's CDN cache instead
export const getCollectionPack = (collection: string) =>
  fetchData<HadithPack>(`hadiths/${collection}/all`, { cache: "no-store" });

export const getSynonyms = () => fetchData<HadithSynonyms>("hadiths/synonyms");

/** The collections with their books, without the books' hadith ids */
export const getHadithResources = async (): Promise<GetHadithResourcesResponse> => {
  const { collections } = await getCollections();
  return {
    collections: await Promise.all(
      collections.map(async (collection) => ({
        ...collection,
        books: (await getBooks(collection.id)).books.map(({ hadiths: _, ...book }) => book),
      })),
    ),
  };
};

/** A book from the URL's segments, checked against the lists first, since the CDN fails on unknown files */
export const findBook = async (collectionId: string, bookId: string) => {
  const collection = (await getCollections()).collections.find((c) => c.id === collectionId);
  if (!collection) {
    return undefined;
  }
  const { books } = await getBooks(collection.id);
  const book = books.find((b) => `${b.id}` === bookId);
  return book && { collection, books, book };
};
