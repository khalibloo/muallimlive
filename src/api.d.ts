interface TranslatedName {
  name: string;
  language_name: string;
}

interface BaseEntity {
  id: number;
}

interface TranslatedEntity extends BaseEntity {
  translated_name: TranslatedName;
}

interface Translation extends TranslatedEntity {
  name: string;
  author_name: string;
  slug: string | null;
  language_name: string;
}

interface Tafsir extends TranslatedEntity {
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
}

interface Recitation extends TranslatedEntity {
  reciter_name: string;
  style: string;
}

interface Language extends TranslatedEntity {
  name: string;
  iso_code: string;
  native_name: string;
  direction: "ltr" | "rtl";
  translations_count: number;
}

interface Chapter extends TranslatedEntity {
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: number[];
}

interface VerseInfo extends BaseEntity {
  verse_number: number;
  verse_key: string;
  juz_number: number;
  hizb_number: number;
  rub_number: number;
  sajdah_type: string | null;
  sajdah_number: number | null;
}

interface VerseContent extends BaseEntity {
  verse_key: string;
}

interface VerseText extends VerseContent {
  text: string;
  isHTML?: boolean;
  isBold?: boolean;
  isArabic?: boolean;
  isTafsir?: boolean;
}

interface VerseIndopak extends VerseContent {
  text_indopak: string;
}

interface VerseUthmani extends VerseContent {
  text_uthmani: string;
}

interface VerseUthmaniSimple extends VerseContent {
  text_uthmani_simple: string;
}

interface VerseUthmaniTajweed extends VerseContent {
  text_uthmani_tajweed: string;
}

interface VerseImlaei extends VerseContent {
  text_imlaei: string;
}

interface VerseImlaeiSimple extends VerseContent {
  text_imlaei_simple: string;
}

interface VerseRecitation extends VerseContent {
  url: string;
}

type Verse =
  | VerseText
  | VerseIndopak
  | VerseImlaei
  | VerseImlaeiSimple
  | VerseUthmani
  | VerseUthmaniSimple
  | VerseUthmaniTajweed;

type ArabicScript = "uthmani" | "uthmani_simple" | "uthmani_tajweed" | "imlaei" | "imlaei_simple" | "indopak";

// resource response types

interface GetTranslationsResponse {
  translations: Translation[];
}

interface GetTafsirsResponse {
  tafsirs: Tafsir[];
}

interface GetRecitationsResponse {
  recitations: Recitation[];
}

interface GetLanguagesResponse {
  languages: Language[];
}

interface GetChaptersResponse {
  chapters: Chapter[];
}

// data response types

interface GetVersesArabicResponse {
  verses: (VerseIndopak | VerseImlaei | VerseImlaeiSimple | VerseUthmani | VerseUthmaniSimple | VerseUthmaniTajweed)[];
}

interface GetVersesRecitationResponse {
  audio_files: VerseRecitation[];
}

interface GetVersesTafsirResponse {
  tafsirs: VerseText[];
}

interface GetVersesTranslationResponse {
  translations: { resource_id: number; text: string }[];
}
