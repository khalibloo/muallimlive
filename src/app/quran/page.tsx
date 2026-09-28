import { Metadata, NextPage } from "next";
import { getTranslations } from "next-intl/server";

import { getChapters } from "@/utils/content";
import Quran from "./Quran";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("common");
  return { title: t("al-quran") };
};

const QuranPage: NextPage = async () => <Quran chapters={(await getChapters()).chapters} />;

export default QuranPage;
