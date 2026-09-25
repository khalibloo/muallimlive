import { Metadata, NextPage } from "next";
import { getTranslations } from "next-intl/server";

import OfflinePage from "./OfflinePage";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("common");
  return {
    title: t("offline"),
    description: t("app-description"),
  };
};

// The service worker precaches this page and serves it for every page request that fails offline
const Offline: NextPage = () => <OfflinePage />;

export default Offline;
