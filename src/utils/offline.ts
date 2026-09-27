import { useSyncExternalStore } from "react";
import pLimit from "p-limit";

import {
  AUDIO_CACHE,
  contentUrl,
  hadithPackUrl,
  packKey,
  recitationUrl,
  SYNONYMS_URL,
  TEXT_CACHE,
  type ContentPack,
} from "./packs";

// Downloads and removals of offline packs in Cache Storage. Downloads keep running when the settings
// modal closes, so their progress lives in a module store rather than in component state.

const CONCURRENCY = 6;

export const isOfflineStorageSupported = () => typeof caches !== "undefined";

/** Download progress (0 to 1) by key: a pack key for text, `audio/<reciter>` for recitations, `hadiths/<collection>` for hadith collections */
let downloads: Record<string, number> = {};
const listeners = new Set<() => void>();

const setProgress = (key: string, value?: number) => {
  const { [key]: _, ...rest } = downloads;
  downloads = value === undefined ? rest : { ...rest, [key]: value };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useDownloads = () =>
  useSyncExternalStore(
    subscribe,
    () => downloads,
    () => downloads,
  );

const track = async (key: string, download: (report: (progress: number) => void) => Promise<void>) => {
  if (key in downloads) {
    return;
  }
  setProgress(key, 0);
  // best effort: keeps the downloads from being evicted under storage pressure
  navigator.storage?.persist?.();
  try {
    await download((progress) => setProgress(key, progress));
  } finally {
    setProgress(key);
  }
};

/** Runs the tasks a few at a time, and stops starting new ones after the first failure */
const runLimited = <T>(tasks: (() => Promise<T>)[]) => {
  const limit = pLimit(CONCURRENCY);
  return Promise.all(
    tasks.map((task) =>
      limit(task).catch((error) => {
        limit.clearQueue();
        throw error;
      }),
    ),
  );
};

const addMissing = async (cache: Cache, url: string) => {
  if (!(await cache.match(url))) {
    await cache.add(url);
  }
};

export const downloadText = (pack: ContentPack, chapterIds: number[]) =>
  track(packKey(pack), async (report) => {
    const cache = await caches.open(TEXT_CACHE);
    let done = 0;
    await runLimited(
      chapterIds.map((id) => async () => {
        await addMissing(cache, contentUrl(pack, id));
        report(++done / chapterIds.length);
      }),
    );
  });

/** A downloaded pack's verse texts for the chapters, in order. Fails when a chapter isn't downloaded. */
export const readText = async (pack: ContentPack, chapterIds: number[]) => {
  const cache = await caches.open(TEXT_CACHE);
  const chapters = await Promise.all(
    chapterIds.map(async (id) => {
      const response = await cache.match(contentUrl(pack, id));
      if (!response) {
        throw new Error(`Chapter ${id} of ${packKey(pack)} isn't downloaded`);
      }
      return (await response.json()) as VerseText[];
    }),
  );
  return chapters.flat();
};

export const removeText = async (pack: ContentPack) => {
  const cache = await caches.open(TEXT_CACHE);
  const prefix = `/api/content/${packKey(pack)}/`;
  const keys = await cache.keys();
  await Promise.all(keys.filter((k) => new URL(k.url).pathname.startsWith(prefix)).map((k) => cache.delete(k)));
};

/** Downloads a hadith collection, and the synonyms its search needs */
export const downloadHadiths = (collection: string) =>
  track(`hadiths/${collection}`, async (report) => {
    const cache = await caches.open(TEXT_CACHE);
    await addMissing(cache, SYNONYMS_URL);
    report(0.1);
    await addMissing(cache, hadithPackUrl(collection));
    report(1);
  });

export const removeHadiths = async (collection: string) => {
  await (await caches.open(TEXT_CACHE)).delete(hadithPackUrl(collection));
};

const fetchRecitation = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const files: VerseRecitation[] = await response.clone().json();
  return { url, response, files: files.map((f) => f.url) };
};

/**
 * Downloads a reciter's audio for the chapters. A chapter's recitation list is stored after all of its
 * files, so its presence in the cache marks the chapter as downloaded.
 */
export const downloadAudio = (reciter: number, chapterIds: number[]) =>
  track(`audio/${reciter}`, async (report) => {
    const cache = await caches.open(AUDIO_CACHE);
    const recitations = await runLimited(chapterIds.map((id) => () => fetchRecitation(recitationUrl(reciter, id))));
    const total = recitations.reduce((sum, r) => sum + r.files.length, 0);
    let done = 0;
    for (const recitation of recitations) {
      await runLimited(
        recitation.files.map((file) => async () => {
          await addMissing(cache, file);
          report(++done / total);
        }),
      );
      await cache.put(recitation.url, recitation.response);
    }
  });

export const removeAudio = async (reciter: number, chapterIds: number[]) => {
  const cache = await caches.open(AUDIO_CACHE);
  for (const id of chapterIds) {
    const url = recitationUrl(reciter, id);
    const response = await cache.match(url);
    if (response) {
      // the list goes first, so an interrupted removal never leaves a chapter marked as downloaded
      const files: VerseRecitation[] = await response.json();
      await cache.delete(url);
      await Promise.all(files.map((f) => cache.delete(f.url)));
    }
  }
};

export interface DownloadStatus {
  /** Downloaded chapter count by pack key */
  text: Record<string, number>;
  /** Downloaded chapter ids by reciter id */
  audio: Record<string, number[]>;
  /** Downloaded hadith collections */
  hadiths: string[];
}

const API_CONTENT = /^\/api\/content\/([^/]+)\/([^/]+)\/(\d+)$/;
const API_HADITHS = /^\/api\/hadiths\/([a-z-]+)$/;

export const getDownloadStatus = async (): Promise<DownloadStatus> => {
  const [textKeys, audioKeys] = await Promise.all(
    [TEXT_CACHE, AUDIO_CACHE].map(async (name) => (await (await caches.open(name)).keys()).map((k) => k.url)),
  );
  const status: DownloadStatus = { text: {}, audio: {}, hadiths: [] };
  for (const url of textKeys) {
    const { pathname } = new URL(url);
    const collection = pathname.match(API_HADITHS)?.[1];
    if (collection && `/api/hadiths/${collection}` !== SYNONYMS_URL) {
      status.hadiths.push(collection);
      continue;
    }
    const [, type, id] = pathname.match(API_CONTENT) ?? [];
    if (type) {
      const key = `${type}/${id}`;
      status.text[key] = (status.text[key] ?? 0) + 1;
    }
  }
  for (const url of audioKeys) {
    const [, type, reciter, chapter] = new URL(url).pathname.match(API_CONTENT) ?? [];
    if (type === "recitation") {
      status.audio[reciter] = [...(status.audio[reciter] ?? []), Number(chapter)];
    }
  }
  return status;
};
