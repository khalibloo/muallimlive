import { readFileSync } from "node:fs";
import { join } from "node:path";

import { mediaUrl } from "./audio";

// Reads the fixture CDN (e2e/fixtures/cdn, served by `pnpm test:e2e:data`) so assertions use exactly
// what the app renders instead of hard-coded copies of the Qur'an data
const readFixture = <T>(path: string): T =>
  JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "cdn", "data", `${path}.json`), "utf8"));

const chapters = readFixture<GetChaptersResponse>("resources/chapters").chapters;

/** The chapter title heading, e.g. "Al-Fatihah - The Opener" */
export const chapterHeading = (chapterId: number) => {
  const chapter = chapters.find((c) => c.id === chapterId)!;
  return `${chapter.name_simple} - ${chapter.translated_name.name}`;
};

export const chapterName = (chapterId: number) => chapters.find((c) => c.id === chapterId)!.name_simple;

export const translationText = (chapterId: number, translationId: number, verse: number) =>
  readFixture<GetVersesTranslationResponse>(`chapters/${chapterId}/translations/${translationId}`).translations[
    verse - 1
  ].text;

/**
 * Visible Arabic text of a verse: tajweed markup stripped, verse-end marker (hidden by CSS) removed.
 * The hidden marker is still in the element's text content, so match this as a substring (no `exact`).
 */
export const arabicText = (chapterId: number, script: ArabicScript, verse: number) => {
  const data = readFixture<{ verses: Record<string, string>[] }>(`chapters/${chapterId}/arabic/${script}`);
  return data.verses[verse - 1][`text_${script}`]
    .replace(/<span class=end>.*?<\/span>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
};

/** First sentence of a verse's tafsir commentary, as plain text (match it as a substring) */
export const tafsirExcerpt = (chapterId: number, tafsirId: number, verse: number) => {
  const { tafsirs } = readFixture<GetVersesTafsirResponse>(`chapters/${chapterId}/tafsirs/${tafsirId}`);
  const html = tafsirs.find((t) => t.verse_id === verse)!.text;
  return html.match(/<span class="commentary-content">([^<.]+)/)![1];
};

/** The (mocked) media URL the app requests for a verse recitation */
export const recitationUrl = (chapterId: number, reciterId: number, verse: number) =>
  mediaUrl(
    readFixture<GetVersesRecitationResponse>(`chapters/${chapterId}/recitations/${reciterId}`).audio_files[verse - 1]
      .url,
  );
