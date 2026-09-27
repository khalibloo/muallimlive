import { omit } from "lodash-es";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const fixtureText = (path: string) =>
  readFileSync(join(__dirname, "../../../e2e/fixtures/cdn/data/hadiths", `${path}.json`), "utf8");

export const fixture = <T>(path: string): T => JSON.parse(fixtureText(path));

export const hadithResources: GetHadithResourcesResponse = {
  collections: fixture<GetHadithCollectionsResponse>("collections").collections.map((collection) => ({
    ...collection,
    books: fixture<GetHadithBooksResponse>(`${collection.id}/books`).books.map((book) => omit(book, "hadiths")),
  })),
};

export const fixtureCollection = (id: string) => hadithResources.collections.find((c) => c.id === id)!;
