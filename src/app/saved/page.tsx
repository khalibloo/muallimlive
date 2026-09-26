import { Metadata, NextPage } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { getChapters } from "@/utils/content";
import { parseReaderSettings, READER_SETTINGS_KEY } from "@/utils/cookies";
import Saved from "./Saved";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("common");
  return { title: t("saved") };
};

// Favorites and notes are stored in the browser, so their verse texts are loaded there too
const SavedPage: NextPage = async () => {
  const { chapters } = await getChapters();
  const readerSettings = parseReaderSettings((await cookies()).get(READER_SETTINGS_KEY)?.value);
  return <Saved chapters={chapters} readerSettings={readerSettings} />;
};

export default SavedPage;
