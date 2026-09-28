// Downloads the subset of the Qur'an data CDN that the Playwright E2E tests need into
// e2e/fixtures/cdn, which `pnpm test:e2e:data` serves as a stand-in for the CDN (API_URI in .env.test).
// Re-run with `pnpm test:e2e:fixtures` when the tests start needing new chapters or content IDs.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const CDN_URI = "https://d28mcm0t8zev62.cloudfront.net";
const OUT_DIR = join(import.meta.dirname, "..", "e2e", "fixtures", "cdn", "data");

// Short chapters keep the fixtures small: Al-Fatihah plus the last three surahs
const CHAPTERS = [1, 112, 113, 114];
// Default reader settings (src/utils/config.ts) plus Saheeh International (20) for the settings tests
const ARABIC_SCRIPTS = ["uthmani_tajweed"];
const TRANSLATIONS = [22, 57, 20];
const TAFSIRS = [0];
// Default reciter (1) plus Mishari Rashid al-`Afasy (7) for the reciter-change tests
const RECITATIONS = [1, 7];

// Hadith books small enough to commit: Bukhari 13's ids repeat book 1's, Muslim 43 has a hadith without
// narrators, and Malik's ids are dotted. They're downloaded from the CDN, or copied from a local data
// folder (`pnpm test:e2e:fixtures <muallimlive-data>/data/hadiths`) when one is given.
const HADITH_BOOKS = { bukhari: [1, 2, 13], muslim: [43], "abu-dawud": [7], malik: [4] };
const HADITHS_DIR = process.argv[2];

const paths = [
  "resources/chapters",
  "resources/tafsirs",
  "resources/recitations",
  "resources/languages",
  "resources/translations",
  ...CHAPTERS.flatMap((id) => [
    ...ARABIC_SCRIPTS.map((script) => `chapters/${id}/arabic/${script}`),
    ...TRANSLATIONS.map((translationId) => `chapters/${id}/translations/${translationId}`),
    ...TAFSIRS.map((tafsirId) => `chapters/${id}/tafsirs/${tafsirId}`),
    ...RECITATIONS.map((reciterId) => `chapters/${id}/recitations/${reciterId}`),
  ]),
];

// The chapter list only has the fixture chapters, so offline downloads of every chapter stay small
const TRANSFORMS = {
  "resources/chapters": (data) => ({ ...data, chapters: data.chapters.filter((c) => CHAPTERS.includes(c.id)) }),
};

const download = async (path) => {
  const res = await fetch(`${CDN_URI}/data/${path}.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const file = join(OUT_DIR, `${path}.json`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(TRANSFORMS[path]?.(data) ?? data, null, 2)}\n`);
};

await Promise.all(paths.map(download));

const readHadiths = async (path) =>
  HADITHS_DIR
    ? JSON.parse(await readFile(join(HADITHS_DIR, `${path}.json`), "utf8"))
    : (await fetch(`${CDN_URI}/data/hadiths/${path}.json`)).json();

const writeHadiths = async (path, data) => {
  const file = join(OUT_DIR, "hadiths", `${path}.json`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
};

const copyHadiths = async () => {
  const { collections } = await readHadiths("collections");
  const subset = [];
  for (const [id, bookIds] of Object.entries(HADITH_BOOKS)) {
    const books = (await readHadiths(`${id}/books`)).books.filter((b) => bookIds.includes(b.id));
    const { hadiths } = await readHadiths(`${id}/all`);
    await writeHadiths(`${id}/books`, { books });
    await writeHadiths(`${id}/all`, { hadiths: hadiths.filter((h) => bookIds.includes(h.book)) });
    for (const book of books) {
      await writeHadiths(`${id}/${book.id}/index`, await readHadiths(`${id}/${book.id}/index`));
      for (const hadith of book.hadiths) {
        await writeHadiths(`${id}/${book.id}/${hadith}`, await readHadiths(`${id}/${book.id}/${hadith}`));
      }
    }
    const collection = collections.find((c) => c.id === id);
    subset.push({
      ...collection,
      booksCount: books.length,
      hadithsCount: books.reduce((n, b) => n + b.hadithsCount, 0),
    });
  }
  await writeHadiths("collections", { collections: subset });
  await writeHadiths("synonyms", await readHadiths("synonyms"));
};

await copyHadiths();
process.stdout.write(`Downloaded ${paths.length} fixture files into ${OUT_DIR}\n`);
