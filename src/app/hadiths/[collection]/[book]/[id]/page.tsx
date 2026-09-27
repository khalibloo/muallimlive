import { Metadata, NextPage } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { findBook, getHadith } from "@/utils/hadiths";
import { getNeighbors } from "@/utils/hadithPack";
import HadithView from "./HadithView";

interface Props {
  params: Promise<{ collection: string; book: string; id: string }>;
}

const findHadith = async ({ params }: Props) => {
  const { collection, book, id } = await params;
  const found = await findBook(collection, book);
  if (!found?.book.hadiths.includes(id)) {
    notFound();
  }
  return { ...found, id };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { collection, book, id } = await findHadith(props);
  const t = await getTranslations("common");
  return { title: t("hadith-page-title", { collection: collection.name, book: book.id, id }) };
}

const HadithPage: NextPage<Props> = async (props) => {
  const { collection, books, book, id } = await findHadith(props);
  const hadith = await getHadith(collection.id, book.id, id);
  return <HadithView hadith={hadith} {...getNeighbors(books, book.id, id)} />;
};

export default HadithPage;
