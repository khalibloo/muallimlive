import { Metadata, NextPage } from "next";
import { notFound } from "next/navigation";

import { getHadithResources } from "@/utils/hadiths";
import Collection from "./Collection";

interface Props {
  params: Promise<{ collection: string }>;
}

const findCollection = async ({ params }: Props) => {
  const { collection } = await params;
  const found = (await getHadithResources()).collections.find((c) => c.id === collection);
  if (!found) {
    notFound();
  }
  return found;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await findCollection(props)).name };
}

const CollectionPage: NextPage<Props> = async (props) => <Collection collection={await findCollection(props)} />;

export default CollectionPage;
