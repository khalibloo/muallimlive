import { Metadata, NextPage } from "next";
import { getTranslations } from "next-intl/server";
import TermsOfService from "./TermsOfService";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("common");
  return {
    title: t("terms-of-service"),
    description: t("terms-of-service-description"),
  };
};

const TermsPage: NextPage = () => <TermsOfService />;

export default TermsPage;
