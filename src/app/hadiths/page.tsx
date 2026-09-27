import { Metadata, NextPage } from "next";
import { getTranslations } from "next-intl/server";

import { getHadithResources } from "@/utils/hadiths";
import Hadiths from "./Hadiths";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("common");
  return { title: t("hadiths") };
};

const HadithsPage: NextPage = async () => <Hadiths collections={(await getHadithResources()).collections} />;

export default HadithsPage;
