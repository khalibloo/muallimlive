import { Metadata, NextPage } from "next";
import { getTranslations } from "next-intl/server";
import PageNotFound from "./PageNotFound";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("common");
  return {
    title: t("page-not-found"),
    description: t("app-description"),
  };
};

const NotFoundPage: NextPage = () => <PageNotFound />;

export default NotFoundPage;
