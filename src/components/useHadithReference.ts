import { useTranslations } from "next-intl";

/** "Volume 2, Book 13, Hadith 1" for Bukhari, "Book 7, Hadith 1406" for the other collections */
const useHadithReference = () => {
  const t = useTranslations("common");
  return ({ volume, book, id }: { volume?: number; book: number; id: string }) =>
    volume ? t("hadith-reference-volume", { volume, book, id }) : t("hadith-reference", { book, id });
};

export default useHadithReference;
