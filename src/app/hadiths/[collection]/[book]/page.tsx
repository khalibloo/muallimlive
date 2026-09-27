import { Metadata, NextPage } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getBookIndex, getHadithResources } from "@/utils/hadiths";
import Book from "./Book";

interface Props {
  params: Promise<{ collection: string; book: string }>;
}

const findBook = async ({ params }: Props) => {
  const { collection, book } = await params;
  const foundCollection = (await getHadithResources()).collections.find((c) => c.id === collection);
  const foundBook = foundCollection?.books.find((b) => `${b.id}` === book);
  if (!foundCollection || !foundBook) {
    notFound();
  }
  return { collection: foundCollection, book: foundBook };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { collection, book } = await findBook(props);
  const t = await getTranslations("common");
  return {
    title: t("hadith-book-title", {
      book: t("hadith-book-name", { id: book.id, name: book.name }),
      collection: collection.name,
    }),
  };
}

const BookPage: NextPage<Props> = async (props) => {
  const { collection, book } = await findBook(props);
  const { hadiths } = await getBookIndex(collection.id, book.id);
  return <Book collection={collection} book={book} hadiths={hadiths} />;
};

export default BookPage;
