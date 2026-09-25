// Downloads the subset of the Qur'an data CDN that the Playwright E2E tests need into
// e2e/fixtures/cdn, which `pnpm test:e2e:data` serves as a stand-in for the CDN (API_URI in .env.test).
// Re-run with `pnpm test:e2e:fixtures` when the tests start needing new chapters or content IDs.
import { mkdir, writeFile } from "node:fs/promises";
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

const download = async (path) => {
  const res = await fetch(`${CDN_URI}/data/${path}.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  }
  const file = join(OUT_DIR, `${path}.json`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(await res.json(), null, 2)}\n`);
};

await Promise.all(paths.map(download));
process.stdout.write(`Downloaded ${paths.length} fixture files into ${OUT_DIR}\n`);
