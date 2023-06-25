import { Metadata, NextPage } from "next";
import { notFound } from "next/navigation";

import Chapter from "./Chapter";
import chaptersData from "@/data/chapters.json";

export const metadata: Metadata = {
  title: "Terms of Service | Muallimlive",
  description: "Muallimlive terms of service document.",
};

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params: { id } }: Props): Promise<Metadata> {
  const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);

  return {
    title: `${chapter?.name_simple} | Muallimlive`,
    description: `Chapter ${id} of the Holy Qur'an`,
  };
}

const ChapterPage: NextPage<Props> = async ({ params: { id } }) => {
  const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);

  if (!chapter) {
    notFound();
  }

  return <Chapter chapter={chapter} />;
};

export default ChapterPage;
