import "server-only";

import config from "./config";
import { fetchData } from "./fetcher";
import type { ContentPack } from "./packs";

// Qur'an data never changes, so the host's CDN (Netlify) can keep /api responses for a long time
export const CACHE_HEADERS = { "Cache-Control": "public, max-age=86400, s-maxage=31536000" };

export const getChapters = () => fetchData<GetChaptersResponse>("resources/chapters");

/** One chapter of a content pack, as one text per verse */
export const getVerseTexts = async ({ type, id }: ContentPack, chapter: Chapter): Promise<VerseText[]> => {
  if (type === "arabic") {
    const data = await fetchData<GetVersesArabicResponse>(`chapters/${chapter.id}/arabic/${id}`);
    return data.verses.map((v) => ({
      id: v.id,
      isArabic: true,
      isHTML: true,
      verse_key: v.verse_key,
      text: (v as unknown as Record<string, string>)[`text_${id}`],
    }));
  }

  if (type === "translation") {
    const data = await fetchData<GetVersesTranslationResponse>(`chapters/${chapter.id}/translations/${id}`);
    return data.translations.map((t, i) => ({
      id: i + 1,
      text: t.text,
      verse_key: `${chapter.id}:${i + 1}`,
      // some translations mark footnotes with <sup>
      isHTML: true,
    }));
  }

  const data = await fetchData<GetVersesTafsirResponse>(`chapters/${chapter.id}/tafsirs/${id}`);
  // some verses are skipped in tafsirs, we should fill in the blanks
  return Array.from({ length: chapter.verses_count }, (_, i) => {
    const tafsir = data.tafsirs.find((t) => t.verse_id === i + 1);
    return tafsir
      ? { id: tafsir.verse_id, verse_key: `${chapter.id}:${i + 1}`, text: tafsir.text, isHTML: true, isTafsir: true }
      : { id: i + 1, text: "", verse_key: `${chapter.id}:${i + 1}` };
  });
};

/** A chapter's recitation files, with absolute URLs on the recitation audio host */
export const getVerseRecitations = async (reciter: number | string, chapterId: number) => {
  const data = await fetchData<GetVersesRecitationResponse>(`chapters/${chapterId}/recitations/${reciter}`);
  return data.audio_files.map((v) => {
    const url = new URL(config.apiMediaUri!);
    url.pathname = v.url;
    return { ...v, url: url.href };
  });
};
