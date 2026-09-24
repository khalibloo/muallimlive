import { Metadata, NextPage } from "next";
import { getTranslations } from "next-intl/server";
import PrivacyPolicy from "./PrivacyPolicy";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("common");
  return {
    title: t("privacy-policy"),
    description: t("privacy-policy-description"),
  };
};

const PrivacyPolicyPage: NextPage = () => <PrivacyPolicy />;

export default PrivacyPolicyPage;
