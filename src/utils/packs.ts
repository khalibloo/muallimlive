// Offline content packs: one pack per content type (an Arabic script, a translation or a tafsir), holding
// every chapter as a /api/content response in Cache Storage. Also one pack per hadith collection, plus the
// shared synonyms, in the same cache. Shared by the server routes, the Storage settings tab, the service
// worker and the offline page.

import type { HadithRef } from "./hadithPack";

export type ContentType = "arabic" | "translation" | "tafsir";

export interface ContentPack {
  type: ContentType;
  id: string;
}

export const TEXT_CACHE = "content-packs";
export const AUDIO_CACHE = "audio-packs";

export const ARABIC_SCRIPTS = {
  indopak: "indopak-script",
  imlaei: "imlaei-script",
  imlaei_simple: "imlaei-simple-script",
  uthmani: "uthmani-script",
  uthmani_simple: "uthmani-simple-script",
  uthmani_tajweed: "uthmani-tajweed-script",
} as const satisfies Record<ArabicScript, string>;

/** The pack a reader settings item is read from. Arabic scripts are listed as "ar" translations. */
export const getContentPack = ({ content }: VerseLayoutItem): ContentPack | undefined => {
  if (!content) {
    return undefined;
  }
  const [kind, language, id] = content;
  if (kind === "tafsir") {
    return { type: "tafsir", id: `${id}` };
  }
  return { type: language === "ar" ? "arabic" : "translation", id: `${id}` };
};

export const packKey = ({ type, id }: ContentPack) => `${type}/${id}`;

export const contentUrl = (pack: ContentPack, chapter: number) => `/api/content/${packKey(pack)}/${chapter}`;

export const recitationUrl = (reciter: number, chapter: number) => `/api/content/recitation/${reciter}/${chapter}`;

export const resourceUrl = (name: "chapters" | "recitations" | "hadiths") => `/api/resources/${name}`;

export const hadithPackUrl = (collection: string) => `/api/hadiths/${collection}`;

export const SYNONYMS_URL = "/api/hadiths/synonyms";

export const hadithUrl = ({ collection, book, id }: HadithRef) => `/api/hadiths/${collection}/${book}/${id}`;

/** Resolves to undefined when the response can't be loaded (offline, the service worker's fetch fails for packs that aren't downloaded) */
export const getJson = async <T>(url: string): Promise<T | undefined> => {
  try {
    const response = await fetch(url);
    return response.ok ? await response.json() : undefined;
  } catch {
    return undefined;
  }
};
